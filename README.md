# OTP Online

Manage time-based one-time passwords (TOTP) in your browser and host your own instance.

**English** · [简体中文](./README.zh-CN.md)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flyxlucky%2Fotp-online&env=AUTH_SECRET%2CENCRYPTION_KEY%2CADMIN_USERNAME%2CADMIN_PASSWORD%2COTP_AUTO_SETUP&envDefaults=%7B%22ADMIN_USERNAME%22%3A%22admin%22%2C%22OTP_AUTO_SETUP%22%3A%221%22%7D&envDescription=Generate%20separate%20Base64%20values%20from%2032%20random%20bytes%20for%20AUTH_SECRET%20and%20ENCRYPTION_KEY.%20Set%20the%20initial%20administrator%20credentials.&envLink=https%3A%2F%2Fgithub.com%2Flyxlucky%2Fotp-online%23deploy-to-vercel&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%2C%22allowConnectExistingProduct%22%3Afalse%7D%5D)

## Features

| Page | What you can do |
| --- | --- |
| `/otp` | Generate codes in the browser, search entries, pin favorites, and copy codes. |
| `/admin` | Manage entries, import by link or QR code, export and restore encrypted backups, and manage Passkeys and recovery codes. |
| `/login` | Sign in with your password, a Passkey, or a one-time recovery code. |

QR scanning requires camera access and a browser that supports `BarcodeDetector`.

## Deploy to Vercel

1. Click **Deploy with Vercel** and create a new Neon database when prompted. The integration supplies the database connection variables.
2. Generate and enter the two secrets listed under [Environment variables](#environment-variables). Set your administrator username and password, and leave `OTP_AUTO_SETUP` set to `1`.
3. Deploy and sign in at `/admin`. The production build applies the database migrations and creates the first administrator.

Later production builds apply pending migrations and preserve existing accounts. You can remove `ADMIN_USERNAME` and `ADMIN_PASSWORD` from Vercel after the first successful deployment. If you manage an existing database separately, leave `OTP_AUTO_SETUP` unset and use `npm run db:migrate` and `npm run db:seed` as needed.

## Local development

You need Node.js 22 or newer, npm, and a Neon PostgreSQL database.

1. Run `npm ci` in the repository root.
2. Copy [`.env.example`](./.env.example) to `.env.local` with `cp .env.example .env.local` in Bash or `Copy-Item .env.example .env.local` in PowerShell. Fill in the [environment variables](#environment-variables).
3. Apply the migrations, create an administrator, and start the development server.

   ```sh
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

4. Open the [admin dashboard](http://localhost:3000/admin) and sign in. Running `db:seed` again updates the password for the same username.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string. Vercel's Neon integration supplies it during deployment. |
| `AUTH_SECRET` | Auth.js session secret. |
| `ENCRYPTION_KEY` | AES-256-GCM key that must decode to 32 bytes from Base64. |
| `ADMIN_USERNAME` | Administrator username. |
| `ADMIN_PASSWORD` | Initial administrator password. Use at most 72 UTF-8 bytes for automatic setup. |

Run this command twice to generate separate values for `AUTH_SECRET` and `ENCRYPTION_KEY`.

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Token visibility and backups

- New entries are visible to guests by default. Enable the admin-only setting for private entries. The browser receives the secrets for entries it can view so that it can generate codes.
- The database encrypts TOTP secrets with AES-256-GCM. Keep the original `ENCRYPTION_KEY` to decrypt existing entries.
- In the admin dashboard, use **Export backup** to encrypt a JSON file in your browser with a separate passphrase. Use **Restore backup** to preview and import it into any instance. Keep the passphrase separately. The restore screen also accepts earlier plaintext exports.
- Restore preserves entry visibility and other settings. **Skip duplicates** matches by TOTP secret, algorithm, digit count, and period. Backups contain OTP entries only. Administrator credentials, Passkeys, and recovery codes stay with the original instance.
- The raw export API returns plaintext for older clients. Store these legacy exports privately.

## Passkeys and recovery codes

Sign in with your password and open **Account security** in the admin dashboard. You can bind a Passkey or generate eight one-time recovery codes after confirming your password. Save the codes offline when they appear. Generating a new set invalidates the previous one.

Passkeys require HTTPS or `http://localhost` for local development. Register and use them on the same domain. For deployments behind a reverse proxy, set `AUTH_URL` to the public site URL if the proxy rewrites the request origin.

Built with Next.js 15, React 19, Ant Design 5, Tailwind CSS, Auth.js, Drizzle ORM, and Neon PostgreSQL.
