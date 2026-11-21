import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt, lte } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from '@otp-online/webauthn-server';
import { db } from '@/lib/db/client';
import { passkeyChallenges, passkeys, users } from '@/lib/db/schema';

export const passkeyTimeout = 5 * 60 * 1000;

export function passkeyOrigin(request: Request) {
  const url = new URL(process.env.AUTH_URL || request.url);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) {
    return null;
  }
  return request.headers.get('origin') === url.origin ? url : null;
}

async function setChallengeCookie(name: string, value: string, origin: URL) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    secure: origin.protocol === 'https:',
    sameSite: 'strict',
    path: '/',
    maxAge: passkeyTimeout / 1000,
  });
}

export async function issueRegistrationChallenge(origin: URL, challenge: string, userId: string) {
  const now = new Date();
  await db.batch([
    db.delete(passkeyChallenges).where(lte(passkeyChallenges.expiresAt, now)),
    db.insert(passkeyChallenges).values({
      challenge,
      purpose: 'register',
      origin: origin.origin,
      userId,
      expiresAt: new Date(now.getTime() + passkeyTimeout),
    }),
  ]);
  await setChallengeCookie('otp-passkey-register', challenge, origin);
}

export async function consumeRegistrationChallenge(origin: URL, userId: string) {
  const challenge = (await cookies()).get('otp-passkey-register')?.value;
  if (!challenge) return null;

  const [record] = await db.delete(passkeyChallenges).where(and(
    eq(passkeyChallenges.challenge, challenge),
    eq(passkeyChallenges.purpose, 'register'),
    eq(passkeyChallenges.userId, userId),
    eq(passkeyChallenges.origin, origin.origin),
    gt(passkeyChallenges.expiresAt, new Date()),
  )).returning();
  return record ?? null;
}

function loginChallengeSignature(origin: URL, payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return createHmac('sha256', secret)
    .update(JSON.stringify(['passkey-login', origin.origin, payload]))
    .digest();
}

async function getLoginChallenge(origin: URL) {
  const value = (await cookies()).get('otp-passkey-login')?.value;
  if (!value) return null;

  const [challenge, expiry, encodedSignature, extra] = value.split('.');
  const expiresAt = Number(expiry);
  const now = Date.now();
  if (extra !== undefined || !challenge || !encodedSignature ||
      !Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + passkeyTimeout) {
    return null;
  }

  const signature = Buffer.from(encodedSignature, 'base64url');
  const expected = loginChallengeSignature(origin, `${challenge}.${expiry}`);
  return signature.length === expected.length && timingSafeEqual(signature, expected)
    ? { challenge, expiresAt: new Date(expiresAt) }
    : null;
}

export async function beginPasskeyLogin(origin: URL) {
  const options = await generateAuthenticationOptions({
    rpID: origin.hostname,
    timeout: passkeyTimeout,
    userVerification: 'required',
  });
  // Issue the public challenge without writing to the database.
  const payload = `${options.challenge}.${Date.now() + passkeyTimeout}`;
  const signature = loginChallengeSignature(origin, payload).toString('base64url');
  await setChallengeCookie('otp-passkey-login', `${payload}.${signature}`, origin);
  return options;
}

export async function verifyPasskeyLogin(request: Request, assertion: unknown) {
  if (typeof assertion !== 'string' || assertion.length > 16_384) return null;
  const origin = passkeyOrigin(request);
  if (!origin) return null;

  let response: AuthenticationResponseJSON;
  try {
    response = JSON.parse(assertion);
    if (typeof response?.id !== 'string') return null;
  } catch {
    return null;
  }

  const challenge = await getLoginChallenge(origin);
  if (!challenge) return null;
  const [account] = await db.select({ key: passkeys, username: users.username })
    .from(passkeys)
    .innerJoin(users, eq(passkeys.userId, users.id))
    .where(and(eq(passkeys.id, response.id), eq(passkeys.rpId, origin.hostname)))
    .limit(1);
  if (!account) return null;

  const { key } = account;
  const userHandle = Buffer.from(key.userId, 'utf8').toString('base64url');
  if (response.response?.userHandle && response.response.userHandle !== userHandle) return null;

  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin.origin,
    expectedRPID: origin.hostname,
    requireUserVerification: true,
    credential: {
      id: key.id,
      publicKey: Buffer.from(key.publicKey, 'base64url'),
      counter: key.counter,
    },
  }).catch(() => null);
  if (!result?.verified || challenge.expiresAt.getTime() <= Date.now()) return null;

  const [, [used]] = await db.batch([
    db.delete(passkeyChallenges).where(lte(passkeyChallenges.expiresAt, new Date())),
    db.insert(passkeyChallenges).values({
      ...challenge, purpose: 'login', origin: origin.origin, userId: key.userId,
    }).onConflictDoNothing().returning({ challenge: passkeyChallenges.challenge }),
  ]);
  if (!used) return null;

  const [updated] = await db.update(passkeys).set({ counter: result.authenticationInfo.newCounter })
    .where(and(eq(passkeys.id, key.id), eq(passkeys.counter, key.counter)))
    .returning({ id: passkeys.id });
  return updated ? { id: key.userId, name: account.username } : null;
}
