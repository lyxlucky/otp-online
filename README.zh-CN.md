# OTP Online

在浏览器中管理和生成 TOTP（基于时间的一次性密码），支持自行部署。

[English](./README.md) · **简体中文**

[![部署到 Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flyxlucky%2Fotp-online&env=AUTH_SECRET%2CENCRYPTION_KEY%2CADMIN_USERNAME%2CADMIN_PASSWORD%2COTP_AUTO_SETUP&envDefaults=%7B%22ADMIN_USERNAME%22%3A%22admin%22%2C%22OTP_AUTO_SETUP%22%3A%221%22%7D&envDescription=Generate%20separate%20Base64%20values%20from%2032%20random%20bytes%20for%20AUTH_SECRET%20and%20ENCRYPTION_KEY.%20Set%20the%20initial%20administrator%20credentials.&envLink=https%3A%2F%2Fgithub.com%2Flyxlucky%2Fotp-online%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%2C%22allowConnectExistingProduct%22%3Afalse%7D%5D)

## 功能

| 页面 | 用途 |
| --- | --- |
| `/otp` | 在浏览器中生成验证码、搜索条目、收藏置顶和复制验证码。 |
| `/admin` | 新增、编辑、删除和排序条目。支持粘贴 `otpauth://totp/…` 链接或扫码导入，以及导出 JSON 备份。 |
| `/login` | 使用管理员账号登录，管理条目并查看仅管理员可见的令牌。 |

扫码导入需要浏览器支持 `BarcodeDetector`，并允许访问摄像头。

## 部署到 Vercel

1. 点击 **Deploy with Vercel**，按提示创建新的 Neon 数据库。集成会自动配置数据库连接变量。
2. 按[环境变量](#环境变量)中的说明生成并填写两个密钥，设置管理员用户名和密码，保留 `OTP_AUTO_SETUP=1`。
3. 部署成功后，打开站点的 `/admin` 登录。生产构建会执行数据库迁移并创建首个管理员。

后续生产构建会应用待执行的迁移，并保留已有账号。首次部署成功后，可从 Vercel 移除 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`。如果现有数据库由你单独管理，请将 `OTP_AUTO_SETUP` 留空，按需运行 `npm run db:migrate` 和 `npm run db:seed`。

## 本地开发

准备 Node.js 22 或更高版本、npm 和一个 Neon PostgreSQL 数据库。

1. 在仓库根目录运行 `npm ci`。
2. 将 [`.env.example`](./.env.example) 复制为 `.env.local`。Bash 使用 `cp .env.example .env.local`，PowerShell 使用 `Copy-Item .env.example .env.local`。复制后填写[环境变量](#环境变量)。
3. 应用迁移，创建管理员并启动开发服务器。

   ```sh
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

4. 打开[管理后台](http://localhost:3000/admin)并登录。再次运行 `db:seed` 会更新同名管理员的密码。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL 连接字符串。通过 Vercel 部署时由 Neon 集成提供。 |
| `AUTH_SECRET` | Auth.js 会话密钥。 |
| `ENCRYPTION_KEY` | AES-256-GCM 密钥，Base64 解码后须为 32 字节。 |
| `ADMIN_USERNAME` | 管理员用户名。 |
| `ADMIN_PASSWORD` | 管理员初始密码。自动初始化时最多使用 72 个 UTF-8 字节。 |

分别运行两次以下命令，为 `AUTH_SECRET` 和 `ENCRYPTION_KEY` 各生成一个值。

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## 令牌可见性与备份

- 新条目默认对访客可见。私有条目请开启「仅管理员可见」。浏览器会收到有权查看的条目的密钥，用于生成验证码。
- 数据库使用 AES-256-GCM 加密 TOTP 密钥。已有条目依赖原来的 `ENCRYPTION_KEY` 解密。
- 导出的 `otp-backup-*.json` 含明文 TOTP 密钥。请将备份和实际环境变量保存在仓库之外。

技术栈为 Next.js 15、React 19、Ant Design 5、Tailwind CSS、Auth.js、Drizzle ORM 和 Neon PostgreSQL。
