import { createHash, randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recoveryCodes, users } from '@/lib/db/schema';

function hash(code: string) {
  return createHash('sha256').update(code.replace(/[\s-]/g, '').toLowerCase()).digest('hex');
}

export async function replaceRecoveryCodes(userId: string) {
  const codes = Array.from({ length: 8 }, () =>
    randomBytes(16).toString('hex').match(/.{8}/g)!.join('-'),
  );
  const hashes = codes.map(hash);
  await db.insert(recoveryCodes).values({ userId, hashes }).onConflictDoUpdate({
    target: recoveryCodes.userId,
    set: { hashes },
  });
  return codes;
}

export async function consumeRecoveryCode(username: unknown, code: unknown) {
  if (typeof username !== 'string' || username.length > 64 ||
      typeof code !== 'string' || code.length > 64 ||
      !/^[a-f0-9]{32}$/i.test(code.replace(/[\s-]/g, ''))) return null;

  const [user] = await db.select({ id: users.id, name: users.username }).from(users)
    .where(eq(users.username, username)).limit(1);
  if (!user) return null;

  const digest = hash(code);
  const [updated] = await db.update(recoveryCodes)
    .set({ hashes: sql`array_remove(${recoveryCodes.hashes}, ${digest})` })
    .where(and(eq(recoveryCodes.userId, user.id), sql`${digest} = ANY(${recoveryCodes.hashes})`))
    .returning({ userId: recoveryCodes.userId });
  return updated ? user : null;
}
