import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { loginSchema } from '@/lib/validations';
import { authConfig } from '@/lib/auth.config';
import { verifyPasskeyLogin } from '@/lib/passkeys';
import { consumeRecoveryCode } from '@/lib/recovery-codes';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const found = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        const user = found[0];
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.username };
      },
    }),
    Credentials({
      id: 'passkey',
      name: 'Passkey',
      credentials: { assertion: {} },
      authorize: (raw, request) => verifyPasskeyLogin(request, raw.assertion),
    }),
    Credentials({
      id: 'recovery-code',
      name: 'Recovery code',
      credentials: { username: {}, code: {} },
      authorize: (raw) => consumeRecoveryCode(raw.username, raw.code),
    }),
  ],
});
