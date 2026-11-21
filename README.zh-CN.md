# OTP Online

OTP Online 是一个可自行部署的 TOTP（基于时间的一次性密码）管理工具。项目使用 Next.js 15、React 19、Ant Design 5 和 Tailwind CSS，使用 Auth.js 登录，并通过 Drizzle ORM 连接 Neon PostgreSQL。

## 功能

- `/otp` 展示令牌卡片，在浏览器生成验证码，支持搜索、收藏置顶和复制验证码。
- `/admin` 需要登录，可新增、编辑、删除和排序条目，支持粘贴 `otpauth://totp/…` 链接、扫码导入和导出 JSON 备份。
- `/login` 使用管理员用户名和密码登录。扫码导入需要浏览器支持 `BarcodeDetector` 并允许访问摄像头。

## 本地运行

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

## 部署到 Vercel

在 Vercel 导入仓库并关联 Neon 数据库，为目标环境设置 `DATABASE_URL`、`AUTH_SECRET` 和 `ENCRYPTION_KEY`。首次使用前，在本地将 `DATABASE_URL` 指向目标数据库，设置管理员用户名和密码，然后运行 `npm run db:migrate` 和 `npm run db:seed`。默认构建命令 `npm run build` 只构建应用，数据库迁移需单独执行。

## 令牌可见性与备份

- 新建条目默认对访客可见。为私有条目开启「仅管理员可见」。浏览器会收到其有权查看的条目的 TOTP 密钥，用于生成验证码。
- 数据库使用 AES-256-GCM 加密存储 TOTP 密钥。保管好 `ENCRYPTION_KEY`，已有条目依赖原密钥解密。
- 导出的 `otp-backup-*.json` 含明文 TOTP 密钥。请私下保存备份，并将实际的环境变量和密钥保存在仓库之外。
