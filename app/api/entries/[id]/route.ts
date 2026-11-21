import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { otpEntries } from '@/lib/db/schema';
import { encryptSecret } from '@/lib/crypto';
import { entryUpdateSchema } from '@/lib/validations';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = entryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  const v = parsed.data;
  if (v.title !== undefined) patch.title = v.title;
  if (v.issuer !== undefined) patch.issuer = v.issuer ?? null;
  if (v.account !== undefined) patch.account = v.account ?? null;
  if (v.algorithm !== undefined) patch.algorithm = v.algorithm;
  if (v.digits !== undefined) patch.digits = v.digits;
  if (v.period !== undefined) patch.period = v.period;
  if (v.sortOrder !== undefined) patch.sortOrder = v.sortOrder;
  if (v.favorite !== undefined) patch.favorite = v.favorite;
  if (v.adminOnly !== undefined) patch.adminOnly = v.adminOnly;
  if (v.secret !== undefined || v.algorithm !== undefined || v.digits !== undefined || v.period !== undefined) {
    patch.restoreKey = null;
  }
  if (v.secret !== undefined) {
    const enc = encryptSecret(v.secret);
    patch.secretCipher = enc.cipher;
    patch.secretIv = enc.iv;
    patch.secretTag = enc.tag;
  }

  const updated = await db
    .update(otpEntries)
    .set(patch)
    .where(eq(otpEntries.id, id))
    .returning({ id: otpEntries.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ id: updated[0].id });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const deleted = await db
    .delete(otpEntries)
    .where(eq(otpEntries.id, id))
    .returning({ id: otpEntries.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
