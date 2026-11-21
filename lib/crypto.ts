import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to 32 bytes (AES-256)');
  }
  return key;
}

export type EncryptedSecret = {
  cipher: string;
  iv: string;
  tag: string;
};

export function getRestoreKey(secret: string, algorithm: string, digits: number, period: number) {
  const normalized = secret.replace(/\s+/g, '').toUpperCase().replace(/=+$/, '');
  return createHmac('sha256', getKey())
    .update(JSON.stringify(['otp-restore', normalized, algorithm, digits, period]))
    .digest('base64url');
}

export function encryptSecret(plain: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptSecret(payload: EncryptedSecret): string {
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(payload.cipher, 'base64')),
    decipher.final(),
  ]);
  return dec.toString('utf8');
}
