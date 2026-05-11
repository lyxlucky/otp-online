import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { encryptSecret } from '@/lib/crypto';
import { importSchema } from '@/lib/validations';

export const runtime = 'nodejs';

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

  const rows = parsed.data.entries.map((e) => {
    const enc = encryptSecret(e.secret);
    return {
      title: e.title,
      issuer: e.issuer ?? null,
      account: e.account ?? null,
      secretCipher: enc.cipher,
      secretIv: enc.iv,
      secretTag: enc.tag,
      algorithm: e.algorithm ?? 'SHA1',
      digits: e.digits ?? 6,
      period: e.period ?? 30,
      sortOrder: e.sortOrder ?? 0,
      favorite: e.favorite ?? false,
      adminOnly: e.adminOnly ?? false,
    };
  });

  const inserted = await db.insert(otpEntries).values(rows).returning({ id: otpEntries.id });
  return NextResponse.json({ imported: inserted.length }, { status: 201 });
}
