import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { users } from '../lib/db/schema';

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.error('请在环境变量中设置 ADMIN_USERNAME 和 ADMIN_PASSWORD');
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const hash = await bcrypt.hash(password, 12);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.username, username));
    console.log(`已更新管理员 "${username}" 的密码`);
  } else {
    await db.insert(users).values({ username, passwordHash: hash });
    console.log(`已创建管理员 "${username}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
