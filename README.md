# WSS QR Signature

## Project Overview

WSS QR Signature is a document issuance and public verification system for PT Wahana Solusi Sejahtera. Organizations create formal documents (certificates, letters of assignment, employment letters), issue them with a unique QR code and signature block image, and anyone can scan the QR code to verify the document's authenticity on a fully server-rendered public page — no account required.

## Prerequisites

- Node.js 20 or higher
- npm 10 or higher

## Quick Start

```bash
git clone https://github.com/your-org/wss-qr-signature.git
cd wss-qr-signature
npm install
cp .env.example .env
# Edit .env and fill in NEXTAUTH_SECRET, DATABASE_URL, etc.
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) and sign in with:

- **Email:** `admin@example.com`
- **Password:** `Admin1234!`

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXTAUTH_SECRET` | Random secret for JWT signing. Generate with `openssl rand -base64 32`. | `supersecretrandomstring` |
| `DATABASE_URL` | SQLite file path (prefix `file:`). | `file:./prisma/dev.db` |
| `NEXTAUTH_URL` | Full canonical URL of the app, used for NextAuth callbacks. | `http://localhost:3000` |
| `BASE_URL` | Base URL for public verification links embedded in QR codes. | `https://wss.example.com` |
| `UPLOAD_DIR` | Absolute path where generated QR PNG and signature block images are stored. | `/var/wss/uploads` |

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server at http://localhost:3000 |
| `npm run build` | Build the production bundle |
| `npm run typecheck` | Run TypeScript type checking without emitting |
| `npm run lint` | Run ESLint across all source files |
| `npm run test` | Run the full Vitest test suite (single-run mode) |
| `npm run test:coverage` | Run tests and generate V8 coverage report |

## Database Commands

```bash
# Open Prisma Studio GUI to browse and edit records
npx prisma studio

# Create and apply a new migration
npx prisma migrate dev --name <migration-name>

# Re-run the seed file (clears and re-populates data)
npx prisma db seed

# Reset database to a clean state and re-apply all migrations
npx prisma migrate reset
```

## Architecture Overview

The application is a Next.js 16 App Router project using SQLite (via better-sqlite3 and the Prisma BetterSqlite3 adapter) in development and upgradeable to PostgreSQL in production. The admin area (`/admin`) handles issuance lifecycle — draft, issue, revoke — and triggers generation of QR PNG and 800×200 signature block images stored on disk. The public verification page (`/verify/[ref]`) is fully server-rendered and returns only public-safe fields with no authentication required.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

## Security Notes

All admin API routes require an ADMIN-role session enforced by `requireAdmin()` in `src/lib/auth-utils.ts`. Public verification endpoints are rate-limited at 20 requests per minute per IP using an in-memory sliding window. Sensitive fields (`adminNotes`, `createdById`, `passwordHash`, email addresses) are never included in public API responses. Passwords are hashed with bcryptjs (12 rounds).

See [docs/SECURITY.md](docs/SECURITY.md) for full details.

## Design System

The UI uses a Tailwind CSS v4 design system with custom tokens defined in `src/app/globals.css`. Colors are Navy (`#1e3a5f`), Gold (`#c9a84c`), and a neutral scale. Typography is Inter for body text, with monospace used for reference codes. Component layout follows a mobile-first pattern with container max-widths and consistent spacing scales.

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for full details.

## License

MIT
