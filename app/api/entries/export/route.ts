import { NextResponse } from 'next/server';
import { asc, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { decryptSecret } from '@/lib/crypto';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(otpEntries)
    .orderBy(desc(otpEntries.favorite), asc(otpEntries.sortOrder), asc(otpEntries.createdAt));

  const entries = rows.map((r) => ({
    title: r.title,
    secret: decryptSecret({ cipher: r.secretCipher, iv: r.secretIv, tag: r.secretTag }),
    issuer: r.issuer,
    account: r.account,
    algorithm: r.algorithm,
    digits: r.digits,
    period: r.period,
    sortOrder: r.sortOrder,
    favorite: r.favorite,
  }));

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="otp-backup-${stamp}.json"`,
      'cache-control': 'no-store',
    },
  });
}
