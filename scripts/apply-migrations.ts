import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = neon(url);

  const dir = join(process.cwd(), 'drizzle');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`→ applying ${file}`);
    const raw = readFileSync(join(dir, file), 'utf8');
    const statements = raw
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await sql.query(stmt);
      } catch (err) {
        const msg = (err as Error).message || '';
        if (msg.includes('already exists')) {
          console.log(`  ↳ skipped (already exists)`);
          continue;
        }
        throw err;
      }
    }
    console.log(`  ✓ done`);
  }
  console.log('✓ migrations applied');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
