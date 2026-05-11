export type ParsedOtpauth = {
  title: string;
  secret: string;
  issuer?: string | null;
  account?: string | null;
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
  digits?: number;
  period?: number;
};

/**
 * Parse an otpauth://totp/... URL.
 * Reference: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
export function parseOtpauthUrl(raw: string): ParsedOtpauth | null {
  const input = raw.trim();
  if (!/^otpauth:\/\/totp\//i.test(input)) return null;

  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }

  const secret = u.searchParams.get('secret');
  if (!secret) return null;

  // Path = /Issuer:account  (URL-encoded)
  const path = decodeURIComponent(u.pathname.replace(/^\//, ''));
  let pathIssuer: string | undefined;
  let account: string | undefined;
  const colonIdx = path.indexOf(':');
  if (colonIdx >= 0) {
    pathIssuer = path.slice(0, colonIdx).trim() || undefined;
    account = path.slice(colonIdx + 1).trim() || undefined;
  } else {
    account = path.trim() || undefined;
  }

  const queryIssuer = u.searchParams.get('issuer') || undefined;
  const issuer = queryIssuer || pathIssuer;

  const algoRaw = (u.searchParams.get('algorithm') || 'SHA1').toUpperCase();
  const algorithm: ParsedOtpauth['algorithm'] =
    algoRaw === 'SHA256' || algoRaw === 'SHA512' ? algoRaw : 'SHA1';

  const digitsRaw = Number(u.searchParams.get('digits') || 6);
  const periodRaw = Number(u.searchParams.get('period') || 30);
  const digits = Number.isFinite(digitsRaw) && digitsRaw >= 6 && digitsRaw <= 8 ? digitsRaw : 6;
  const period = Number.isFinite(periodRaw) && periodRaw >= 15 && periodRaw <= 120 ? periodRaw : 30;

  const title = issuer
    ? account
      ? `${issuer} (${account})`
      : issuer
    : account || 'Untitled';

  return {
    title,
    secret: secret.replace(/\s+/g, '').toUpperCase(),
    issuer: issuer ?? null,
    account: account ?? null,
    algorithm,
    digits,
    period,
  };
}
