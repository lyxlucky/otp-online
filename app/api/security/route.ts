import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from '@otp-online/webauthn-server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { passkeys, recoveryCodes, users } from '@/lib/db/schema';
import { consumeRegistrationChallenge, issueRegistrationChallenge, passkeyOrigin, passkeyTimeout } from '@/lib/passkeys';
import { replaceRecoveryCodes } from '@/lib/recovery-codes';

export const runtime = 'nodejs';

const password = z.string().min(1).max(128);
const id = z.string().min(1).max(2048);
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('register-options'), password }),
  z.object({
    action: z.literal('register'),
    label: z.string().trim().min(1).max(80),
    response: z.object({ id }).passthrough(),
  }),
  z.object({ action: z.literal('remove-passkey'), id, password }),
  z.object({ action: z.literal('replace-recovery-codes'), password }),
]);

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return reply({ error: 'unauthorized' }, 401);

  const [keys, [codes]] = await Promise.all([
    db.select({
      id: passkeys.id,
      label: passkeys.label,
      createdAt: passkeys.createdAt,
      rpId: passkeys.rpId,
    }).from(passkeys).where(eq(passkeys.userId, userId)).orderBy(passkeys.createdAt),
    db.select({ hashes: recoveryCodes.hashes }).from(recoveryCodes)
      .where(eq(recoveryCodes.userId, userId)).limit(1),
  ]);
  return reply({ passkeys: keys, remainingCodes: codes?.hashes.length ?? 0 });
}

export async function POST(request: Request) {
  const origin = passkeyOrigin(request);
  if (!origin) return reply({ error: 'invalid_origin' }, 403);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return reply({ error: 'unauthorized' }, 401);

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply({ error: 'invalid_input' }, 400);
  const data = parsed.data;

  if (data.action === 'register') {
    const challenge = await consumeRegistrationChallenge(origin, userId);
    if (!challenge) return reply({ error: 'invalid_challenge' }, 400);

    const result = await verifyRegistrationResponse({
      response: data.response as unknown as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin.origin,
      expectedRPID: origin.hostname,
      requireUserVerification: true,
    }).catch(() => null);
    if (!result?.verified || !result.registrationInfo) {
      return reply({ error: 'invalid_passkey' }, 400);
    }

    const { credential } = result.registrationInfo;
    const [created] = await db.insert(passkeys).values({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      label: data.label,
      rpId: origin.hostname,
      userId,
    }).onConflictDoNothing().returning({ id: passkeys.id });
    return created ? reply(created, 201) : reply({ error: 'existing_passkey' }, 409);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !await bcrypt.compare(data.password, user.passwordHash)) {
    return reply({ error: 'invalid_password' }, 403);
  }

  if (data.action === 'replace-recovery-codes') {
    return reply({ codes: await replaceRecoveryCodes(userId) });
  }
  if (data.action === 'remove-passkey') {
    const [removed] = await db.delete(passkeys)
      .where(and(eq(passkeys.id, data.id), eq(passkeys.userId, userId)))
      .returning({ id: passkeys.id });
    return removed ? reply({ ok: true }) : reply({ error: 'not_found' }, 404);
  }

  const existing = await db.select({ id: passkeys.id }).from(passkeys)
    .where(and(eq(passkeys.userId, userId), eq(passkeys.rpId, origin.hostname)));
  const options = await generateRegistrationOptions({
    rpName: 'OTP Online',
    rpID: origin.hostname,
    userID: Buffer.from(userId, 'utf8'),
    userName: user.username,
    timeout: passkeyTimeout,
    excludeCredentials: existing,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  await issueRegistrationChallenge(origin, options.challenge, userId);
  return reply(options);
}
