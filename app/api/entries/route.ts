import { NextResponse } from 'next/server';
import { asc, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { entryCreateSchema } from '@/lib/validations';

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

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    issuer: r.issuer,
    account: r.account,
    secret: decryptSecret({ cipher: r.secretCipher, iv: r.secretIv, tag: r.secretTag }),
    algorithm: r.algorithm,
    digits: r.digits,
    period: r.period,
    sortOrder: r.sortOrder,
    favorite: r.favorite,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = entryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const enc = encryptSecret(parsed.data.secret);
  const inserted = await db
    .insert(otpEntries)
    .values({
      title: parsed.data.title,
      issuer: parsed.data.issuer ?? null,
      account: parsed.data.account ?? null,
      secretCipher: enc.cipher,
      secretIv: enc.iv,
      secretTag: enc.tag,
      algorithm: parsed.data.algorithm ?? 'SHA1',
      digits: parsed.data.digits ?? 6,
      period: parsed.data.period ?? 30,
      sortOrder: parsed.data.sortOrder ?? 0,
      favorite: parsed.data.favorite ?? false,
    })
    .returning({ id: otpEntries.id });

  return NextResponse.json({ id: inserted[0].id }, { status: 201 });
}
