import { Client } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { users } from '../lib/db/schema';
import { loginSchema } from '../lib/validations';

async function setup() {
  if (process.env.VERCEL_ENV !== 'production' || process.env.OTP_AUTO_SETUP !== '1') {
    return;
  }

  const { DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_SECRET, ENCRYPTION_KEY } = process.env;
  if (!DATABASE_URL) {
    throw new Error('Connect the Neon database to the Vercel production environment.');
  }
  if (
    Buffer.from(AUTH_SECRET ?? '', 'base64').length !== 32 ||
    Buffer.from(ENCRYPTION_KEY ?? '', 'base64').length !== 32
  ) {
    throw new Error('AUTH_SECRET and ENCRYPTION_KEY must each be 32 random bytes encoded in Base64.');
  }

  const connectionString = DATABASE_URL_UNPOOLED || DATABASE_URL;
  const endpoint = new URL(connectionString);
  if (endpoint.hostname.split('.')[0].endsWith('-pooler')) {
    throw new Error('Set DATABASE_URL_UNPOOLED to the direct Neon connection string for migrations.');
  }

  const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });
  try {
    await client.connect();
    // Keep the lock on this direct connection until migration and account creation finish.
    await client.query("SELECT pg_advisory_lock(hashtextextended('otp-online:setup', 0))");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: 'drizzle' });

    const [existing] = await db.select({ id: users.id }).from(users).limit(1);
    if (existing) return;

    const credentials = loginSchema.safeParse({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    });
    if (!credentials.success || Buffer.byteLength(credentials.data.password, 'utf8') > 72) {
      throw new Error('Set ADMIN_USERNAME (1–64 characters) and ADMIN_PASSWORD (1–72 UTF-8 bytes).');
    }

    const { username, password } = credentials.data;
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({ username, passwordHash }).onConflictDoNothing({
      target: users.username,
    });
    console.log('Initial administrator is ready.');
  } finally {
    await client.end();
  }
}

setup().catch((error: unknown) => {
  const message = error instanceof Error ? error.message.split('\n')[0] : 'Unknown error';
  console.error('Vercel setup failed:', message);
  process.exitCode = 1;
});
