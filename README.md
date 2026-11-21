# OTP Online

[简体中文](#简体中文) · [English](#english)

## 简体中文

OTP Online 是一个可自行部署的 TOTP（基于时间的一次性密码）管理工具。项目使用 Next.js 15、React 19、Ant Design 5 和 Tailwind CSS，使用 Auth.js 登录，并通过 Drizzle ORM 连接 Neon PostgreSQL。

### 功能

- `/otp` 展示令牌卡片，在浏览器生成验证码，支持搜索、收藏置顶和复制验证码。
- `/admin` 需要登录，可新增、编辑、删除和排序条目，支持粘贴 `otpauth://totp/…` 链接、扫码导入和导出 JSON 备份。
- `/login` 使用管理员用户名和密码登录。扫码导入需要浏览器支持 `BarcodeDetector` 并允许访问摄像头。

### 本地运行

准备 Node.js 22 或更高版本、npm 和一个 Neon PostgreSQL 数据库。

1. 在项目根目录运行 `npm ci` 安装依赖。
2. 将 [`.env.example`](.env.example) 复制为 `.env.local`。在 PowerShell 中运行 `Copy-Item .env.example .env.local`，在 Bash 中运行 `cp .env.example .env.local`。
3. 按下表填写环境变量。分别运行两次下方命令，为 `AUTH_SECRET` 和 `ENCRYPTION_KEY` 各生成一个值。

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   | 变量 | 用途 |
   | --- | --- |
   | `DATABASE_URL` | Neon PostgreSQL 连接字符串 |
   | `AUTH_SECRET` | Auth.js 会话密钥 |
   | `ENCRYPTION_KEY` | AES-256-GCM 密钥，Base64 解码后须为 32 字节 |
   | `ADMIN_USERNAME` | 初始化或更新管理员时使用的用户名 |
   | `ADMIN_PASSWORD` | 初始化或更新管理员时使用的密码 |

4. 应用仓库中的数据库迁移，创建管理员并启动开发服务器。

   ```sh
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

5. 打开 [管理后台](http://localhost:3000/admin)，使用上一步创建的管理员登录并添加条目。再次运行 `db:seed` 会更新同名管理员的密码。

### 部署到 Vercel

在 Vercel 导入仓库并关联 Neon 数据库，为目标环境设置 `DATABASE_URL`、`AUTH_SECRET` 和 `ENCRYPTION_KEY`。首次使用前，在本地将 `DATABASE_URL` 指向目标数据库，设置管理员用户名和密码，然后运行 `npm run db:migrate` 和 `npm run db:seed`。默认构建命令 `npm run build` 只构建应用，数据库迁移需单独执行。

### 令牌可见性与备份

- 新建条目默认对访客可见。为私有条目开启「仅管理员可见」。浏览器会收到其有权查看的条目的 TOTP 密钥，用于生成验证码。
- 数据库使用 AES-256-GCM 加密存储 TOTP 密钥。保管好 `ENCRYPTION_KEY`，已有条目依赖原密钥解密。
- 导出的 `otp-backup-*.json` 含明文 TOTP 密钥。请私下保存备份，并将实际的环境变量和密钥保存在仓库之外。

## English

OTP Online is a self-hostable tool for managing time-based one-time passwords (TOTP). It uses Next.js 15, React 19, Ant Design 5, and Tailwind CSS, with Auth.js for sign-in and Drizzle ORM for Neon PostgreSQL.

### Features

- `/otp` displays token cards and generates codes in the browser. You can search entries, pin favorites, and copy codes.
- `/admin` requires sign-in. You can create, edit, delete, and reorder entries, import `otpauth://totp/…` links and QR codes, and export JSON backups.
- `/login` accepts administrator credentials. QR import requires camera access and a browser that supports `BarcodeDetector`.

### Local setup

You need Node.js 22 or newer, npm, and a Neon PostgreSQL database.

1. Run `npm ci` in the project root to install dependencies.
2. Copy [`.env.example`](.env.example) to `.env.local`. Use `Copy-Item .env.example .env.local` in PowerShell or `cp .env.example .env.local` in Bash.
3. Set the variables below. Run this command twice to generate separate values for `AUTH_SECRET` and `ENCRYPTION_KEY`.

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   | Variable | Purpose |
   | --- | --- |
   | `DATABASE_URL` | Neon PostgreSQL connection string |
   | `AUTH_SECRET` | Auth.js session secret |
   | `ENCRYPTION_KEY` | AES-256-GCM key that must decode to 32 bytes from Base64 |
   | `ADMIN_USERNAME` | Username used to create or update the administrator |
   | `ADMIN_PASSWORD` | Password used to create or update the administrator |

4. Apply the checked-in migrations, create the administrator, and start the development server.

   ```sh
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

5. Open the [admin dashboard](http://localhost:3000/admin), sign in as the administrator you created, and add an entry. Running `db:seed` again updates the password for the same username.

### Deploy to Vercel

Import the repository into Vercel and connect a Neon database. Set `DATABASE_URL`, `AUTH_SECRET`, and `ENCRYPTION_KEY` in the target environment. Before first use, point your local `DATABASE_URL` at the target database, set the administrator credentials, and run `npm run db:migrate` and `npm run db:seed`. The default `npm run build` command builds the application. Run database migrations separately.

### Token visibility and backups

- New entries are visible to guests by default. Enable the admin-only setting for private entries. The browser receives the TOTP secrets for entries it can view so it can generate codes.
- TOTP secrets are stored in the database with AES-256-GCM encryption. Keep the original `ENCRYPTION_KEY` available to decrypt existing entries.
- Exported `otp-backup-*.json` files contain plaintext TOTP secrets. Store backups privately and keep actual environment values and keys outside the repository.
