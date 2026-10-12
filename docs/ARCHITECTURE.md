# Architecture — WSS QR Signature

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma |
| Auth | NextAuth.js v5 beta (credentials provider + PrismaAdapter) |
| Styling | Tailwind CSS v4 |
| QR generation | `qrcode` npm package |
| Image composition | `@napi-rs/canvas` + `sharp` |
| Validation | Zod |
| Icons | lucide-react |
| Testing | Vitest + @testing-library/react |

## 2. Directory Structure

```
/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Migration history (checked in)
│   ├── seed.ts                # Seed data script
│   └── dev.db                 # SQLite dev database (git-ignored)
├── src/
│   ├── app/                   # Next.js App Router routes
│   │   ├── api/               # API route handlers
│   │   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   │   ├── issuances/     # Issuance CRUD + actions
│   │   │   ├── organizations/ # Org CRUD + logo upload
│   │   │   └── verify/[ref]/  # Public verification endpoint
│   │   ├── admin/             # Protected admin pages
│   │   │   ├── page.tsx       # Dashboard
│   │   │   ├── issuances/     # Archive + new + detail
│   │   │   └── settings/      # Org settings + logo
│   │   ├── sign-in/           # Auth pages
│   │   └── verify/[ref]/      # Public verification page
│   ├── components/
│   │   ├── ui/                # Shared primitive components
│   │   └── layout/            # Layout shells (AdminLayout)
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton
│   │   ├── auth-utils.ts      # requireAdmin, getSession
│   │   ├── qr-generator.ts    # QR PNG generation
│   │   ├── signature-block-generator.ts  # Signature block PNG
│   │   ├── issuance-state-machine.ts     # State transition rules
│   │   ├── audit.ts           # Append-only audit writer
│   │   ├── rate-limit.ts      # In-memory sliding window
│   │   ├── api-response.ts    # Consistent response helpers
│   │   └── schemas/           # Zod validation schemas
│   ├── types/
│   │   └── next-auth.d.ts     # Session type augmentation
│   └── test/
│       └── setup.ts           # Vitest + @testing-library setup
├── docs/                      # Project documentation
├── uploads/                   # Generated assets (git-ignored)
├── .env                       # Local environment (git-ignored)
├── .env.example               # Environment template (checked in)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

## 3. Request Flow

### Admin API Route
```
Browser → Next.js middleware (auth check) → API Route Handler
  → Zod validation → Service logic (lib/) → Prisma (db.ts) → SQLite/PostgreSQL
  → Audit event → JSON response
```

### Public Verification
```
Scanner/Browser → /verify/[ref] (SSR page) → fetch /api/verify/[ref]
  → Rate limiter → Prisma lookup by ref field → Filtered public fields → HTML response
```

### QR + PNG Generation
```
POST /api/issuances/[id]/issue
  → Auth check → State machine validation (DRAFT → ISSUED)
  → generateQR(verificationUrl, logoPath?) → PNG buffer
  → generateSignatureBlock(issuance, qrBuffer) → PNG buffer
  → Write files to UPLOAD_DIR
  → Create GeneratedAsset records
  → Update issuance status (within Prisma transaction)
  → Write audit event
```

## 4. Authentication Architecture

NextAuth.js v5 with:
- **Credentials provider**: email + bcrypt password verification
- **PrismaAdapter**: stores sessions in database (JWT strategy)
- **JWT session**: `role` field included in token for middleware access
- **Middleware** (`src/middleware.ts`): protects all `/admin/*` routes

Session type augmented via `src/types/next-auth.d.ts` to include `role: UserRole`.

## 5. Database Strategy

- **Development**: SQLite (`file:./dev.db`) — zero infrastructure required
- **Production**: PostgreSQL — change `DATABASE_URL` only; schema is compatible
- All timestamps stored as UTC via `DateTime @default(now())`
- Reference IDs use `nanoid(21)` — not sequential database IDs
- Prisma client singleton in `src/lib/db.ts` prevents connection exhaustion during Next.js hot reload

## 6. File Storage

Generated assets and uploaded logos are stored on the filesystem at `UPLOAD_DIR`.

Structure:
```
$UPLOAD_DIR/
├── logos/          # Normalized org logos (max 300×300 px)
└── assets/         # Generated QR PNGs and signature blocks
    └── {issuanceId}/
        ├── qr.png
        └── signature-block.png
```

Asset records in the database store relative paths from `UPLOAD_DIR`.

## 7. Service Layer Separation

Business logic is in `src/lib/` and is independent of HTTP:

| Module | Responsibility |
|---|---|
| `qr-generator.ts` | QR buffer generation with logo overlay and scan validation |
| `signature-block-generator.ts` | Compositing org logo + QR + metadata text into PNG |
| `issuance-state-machine.ts` | Pure transition rules (no DB access) |
| `audit.ts` | Append-only audit event writer (never throws) |
| `rate-limit.ts` | In-memory sliding window limiter |
| `auth-utils.ts` | Session helpers and admin guard |

API routes orchestrate these modules; they do not contain business logic themselves.

## 8. Key Constraints

- TypeScript strict mode — no `any`, no `as any`
- Public URLs never contain database IDs or predictable sequences
- Audit log is append-only — no UPDATE or DELETE on `AuditEvent`
- Revoked records are never deleted — status change only
- Public verification endpoint never returns: `adminNotes`, `createdById`, creator email, internal DB IDs
- File uploads validated server-side for MIME type and size; normalized with `sharp`
