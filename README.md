# OTP Online

OTP Online is a self-hostable tool for managing time-based one-time passwords (TOTP). It uses Next.js 15, React 19, Ant Design 5, and Tailwind CSS, with Auth.js for sign-in and Drizzle ORM for Neon PostgreSQL.

## Features

- `/otp` displays token cards and generates codes in the browser. You can search entries, pin favorites, and copy codes.
- `/admin` requires sign-in. You can create, edit, delete, and reorder entries, import `otpauth://totp/…` links and QR codes, and export JSON backups.
- `/login` accepts administrator credentials. QR import requires camera access and a browser that supports `BarcodeDetector`.

## Local setup

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

## Deploy to Vercel

Import the repository into Vercel and connect a Neon database. Set `DATABASE_URL`, `AUTH_SECRET`, and `ENCRYPTION_KEY` in the target environment. Before first use, point your local `DATABASE_URL` at the target database, set the administrator credentials, and run `npm run db:migrate` and `npm run db:seed`. The default `npm run build` command builds the application. Run database migrations separately.

## Token visibility and backups

- New entries are visible to guests by default. Enable the admin-only setting for private entries. The browser receives the TOTP secrets for entries it can view so it can generate codes.
- TOTP secrets are stored in the database with AES-256-GCM encryption. Keep the original `ENCRYPTION_KEY` available to decrypt existing entries.
- Exported `otp-backup-*.json` files contain plaintext TOTP secrets. Store backups privately and keep actual environment values and keys outside the repository.
