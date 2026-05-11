# OTP Online — 后台管理版

基于 Next.js 15 + AntD 5 的 TOTP 验证码管理系统,完全跑在 Vercel 免费额度内。

## 技术栈

- **Hosting:** Vercel Hobby (免费)
- **DB:** Neon Postgres,通过 Vercel Marketplace 集成 (免费 0.5 GB)
- **ORM:** Drizzle ORM + drizzle-kit
- **Auth:** Auth.js v5 (Credentials + JWT)
- **加密:** AES-256-GCM (Node `crypto`,主密钥来自 env)
- **UI:** Ant Design 5 + Tailwind CSS

## 功能

- `/login` — 单管理员登录页
- `/otp` — 已登录后查看所有 TOTP 卡片,行为与原版一致(客户端用 `otplib` 生成 6 位码)
- `/admin` — 条目管理后台 (新增 / 编辑 / 删除 / 排序)
- secret 以 AES‑256‑GCM 密文落库,服务端按需解密后下发已认证客户端

## 本地开发

1. 复制环境变量模板,填好后改名为 `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. 生成强随机的 `AUTH_SECRET` 与 `ENCRYPTION_KEY`:

   ```bash
   # macOS / Linux
   openssl rand -base64 32

   # Windows PowerShell
   [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

3. 在 [Neon](https://neon.tech) 或 Vercel Dashboard → Storage → Neon 集成 创建数据库,把 `DATABASE_URL` 填入 `.env.local`。

4. 安装依赖、初始化表、种子管理员:

   ```bash
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

5. 浏览器打开 http://localhost:3000 ,会被重定向到 `/login`。用 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录,进入 `/admin` 添加 OTP 条目。

> 如果还没准备好生成迁移文件,也可以使用 `npm run db:push` 直接把 schema 推到 DB(适合开发期)。

## Vercel 部署

1. 在 Vercel 导入此仓库。
2. **Storage → Neon Marketplace** 创建数据库,关联到本项目;`DATABASE_URL` 等连接变量会自动注入。
3. 在项目 Settings → Environment Variables 中添加:
   - `AUTH_SECRET`
   - `ENCRYPTION_KEY`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
4. 触发部署。首次部署后,在本地执行:

   ```bash
   vercel env pull .env.local
   npm run db:migrate
   npm run db:seed
   ```

   也可以把 `db:migrate` 加入 `build` 脚本(`"build": "drizzle-kit migrate && next build"`),让每次部署自动跑迁移。

## 安全说明

- `ENCRYPTION_KEY` 与 `AUTH_SECRET` 务必只放 Vercel env,不要入仓。
- 所有 `/api/entries*` 路由强制 Node runtime,确保 `crypto` 与 `bcryptjs` 可用。
- secret 明文仅在两处:服务端解密内存中 → 已登录会话下发给浏览器 → 由 `otplib` 在客户端生成 token,不持久化。
