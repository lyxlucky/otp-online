import { NextResponse } from 'next/server';
import { beginPasskeyLogin, passkeyOrigin } from '@/lib/passkeys';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = passkeyOrigin(request);
  if (!origin) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });

  return NextResponse.json(await beginPasskeyLogin(origin), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
