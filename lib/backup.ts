import { z } from 'zod';
import { entryCreateSchema } from './validations';

const format = 'otp-online-encrypted-backup';
const context = new TextEncoder().encode(`${format}:1`);
const backupSchema = z.object({
  version: z.literal(1),
  entries: z.array(entryCreateSchema),
});
const encryptedSchema = z.object({
  format: z.literal(format),
  version: z.literal(1),
  salt: z.string(),
  iv: z.string(),
  ciphertext: z.string(),
});

function toBase64(bytes: Uint8Array) {
  const parts: string[] = [];
  for (let start = 0; start < bytes.length; start += 16_384) {
    parts.push(String.fromCharCode(...bytes.subarray(start, start + 16_384)));
  }
  return btoa(parts.join(''));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function backupKey(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function encryptBackup(data: unknown, password: string) {
  const contents = backupSchema.parse(data);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await backupKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: context },
    key, new TextEncoder().encode(JSON.stringify(contents)),
  );
  return JSON.stringify({
    format,
    version: 1,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  });
}

export async function readBackup(data: unknown, password: string) {
  const oldBackup = backupSchema.safeParse(data);
  if (oldBackup.success) return oldBackup.data;

  const backup = encryptedSchema.parse(data);
  if (!password) throw new Error('请输入备份口令');
  const salt = fromBase64(backup.salt);
  const iv = fromBase64(backup.iv);
  if (salt.length !== 16 || iv.length !== 12) throw new Error('备份格式无效');

  const key = await backupKey(password, salt);
  const decoded = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: context }, key, fromBase64(backup.ciphertext),
  ).catch(() => {
    throw new Error('备份口令不正确，或文件已损坏');
  });
  return backupSchema.parse(JSON.parse(new TextDecoder().decode(decoded)));
}

export function isEncryptedBackup(data: unknown) {
  return encryptedSchema.safeParse(data).success;
}

export type Backup = z.infer<typeof backupSchema>;
