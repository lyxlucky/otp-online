import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { decryptSecret, encryptSecret, getRestoreKey } from '@/lib/crypto';
import { importSchema } from '@/lib/validations';

export const runtime = 'nodejs';

function restoredEntryId(importId: string, index: number, userId: string) {
  const hex = createHash('sha256').update(JSON.stringify([importId, index, userId])).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { entries, skipDuplicates, restore } = parsed.data;
  const knownKeys = new Set<string>();
  if (skipDuplicates) {
    const existing = await db.select({
      cipher: otpEntries.secretCipher,
      iv: otpEntries.secretIv,
      tag: otpEntries.secretTag,
      algorithm: otpEntries.algorithm,
      digits: otpEntries.digits,
      period: otpEntries.period,
    }).from(otpEntries);
    for (const row of existing) {
      knownKeys.add(getRestoreKey(decryptSecret(row), row.algorithm, row.digits, row.period));
    }
  }

  const rows: (typeof otpEntries.$inferInsert)[] = [];
  for (const [index, e] of entries.entries()) {
    const algorithm = e.algorithm ?? 'SHA1';
    const digits = e.digits ?? 6;
    const period = e.period ?? 30;
    const restoreKey = skipDuplicates ? getRestoreKey(e.secret, algorithm, digits, period) : null;
    if (restoreKey && knownKeys.has(restoreKey)) continue;
    if (restoreKey) knownKeys.add(restoreKey);
    const enc = encryptSecret(e.secret);
    rows.push({
      id: restore ? restoredEntryId(restore.id, restore.offset + index, session.user.id ?? '') : undefined,
      title: e.title,
      issuer: e.issuer ?? null,
      account: e.account ?? null,
      secretCipher: enc.cipher,
      secretIv: enc.iv,
      secretTag: enc.tag,
      algorithm,
      digits,
      period,
      sortOrder: e.sortOrder ?? 0,
      favorite: e.favorite ?? false,
      adminOnly: e.adminOnly ?? false,
      restoreKey,
    });
  }

  const inserted = rows.length === 0 ? [] : await db.insert(otpEntries).values(rows)
    .onConflictDoNothing().returning({ id: otpEntries.id });
  const result = skipDuplicates || restore
    ? { imported: inserted.length, skipped: entries.length - inserted.length }
    : { imported: inserted.length };
  return NextResponse.json(result, { status: 201 });
}
