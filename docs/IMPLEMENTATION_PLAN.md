# Implementation Plan — WSS QR Signature

**Product:** WSS QR Signature — institutional QR-based document issuance and public verification  
**Stack:** Next.js 15 App Router · TypeScript strict · Prisma + SQLite (dev) / PostgreSQL (prod) · NextAuth.js v5 · Tailwind CSS v4 · Vitest  
**Design direction:** Enterprise Information System — restrained, typographically-led, institutional navy palette (#1e3a5f)

---

## Phase 1 — Project Scaffolding & Documentation (FEAT-001)

**Goal:** Runnable Next.js project with all dependencies, configuration, and documentation.

Steps:
1. Scaffold Next.js 15 with TypeScript, Tailwind, ESLint, App Router, `src/` directory.
2. Install all runtime deps (`prisma`, `@prisma/client`, `next-auth@beta`, `@auth/prisma-adapter`, `qrcode`, `@napi-rs/canvas`, `nanoid`, `zod`, `lucide-react`, `sharp`).
3. Install dev deps (`vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `@types/qrcode`, `ts-node`, `bcryptjs`).
4. Configure Vitest with jsdom environment.
5. Write 8 documentation files in `docs/`.
6. Create `.env.example` with all 5 required variables.
7. Initialize Prisma with SQLite.
8. Write complete Prisma schema (8 entities, 3 enums).
9. Run initial migration and generate Prisma client.
10. Write and run database seed script.
11. Create Prisma client singleton (`src/lib/db.ts`).
12. Configure NextAuth.js v5 (`src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`).
13. Write middleware for admin route protection.
14. Write auth utility helpers.

**Done when:** `npm run build`, `npm run typecheck`, `npx prisma validate`, `npx prisma db seed` all exit 0.

---

## Phase 2 — Core API Routes (FEAT-002)

**Goal:** All 10 API endpoints with Zod validation, auth checks, audit logging.

Endpoints:
- `POST /api/issuances` — create DRAFT
- `GET /api/issuances` — list with pagination/search/filter
- `GET /api/issuances/:id` — get detail
- `PATCH /api/issuances/:id` — update DRAFT
- `POST /api/issuances/:id/issue` — generate QR + PNG, transition to ISSUED
- `POST /api/issuances/:id/revoke` — transition to REVOKED
- `GET /api/verify/:ref` — public verification (rate-limited)
- `POST /api/organizations` — create org
- `GET /api/organizations` — list orgs
- `POST /api/organizations/:id/logo` — upload logo
- `GET /api/issuances/:id/assets/:assetId` — download asset

**Done when:** All endpoints respond correctly; `npm run typecheck` passes.

---

## Phase 3 — QR & PNG Generation (FEAT-002, same phase)

**Goal:** Production-quality QR with logo overlay and validated scannability; print-ready signature block.

- `src/lib/qr-generator.ts`: generate QR at 800×800 px (error correction H), overlay logo (160×160 + 8px padding), validate scannability, fallback to no-logo.
- `src/lib/signature-block-generator.ts`: compose 800×200 px PNG with org logo, QR, and metadata text using `@napi-rs/canvas`.

---

## Phase 4 — Admin Dashboard UI (FEAT-003)

**Goal:** Complete, functional admin interface. Anti-AI-Slop score ≥ 42/50.

Design tokens → Shared UI components → Individual pages:
- `/sign-in` — Clean credentials form
- `/admin` — Stats dashboard (real counts from DB)
- `/admin/issuances/new` — Issuance creation form
- `/admin/issuances` — Archive with search, filter, sort, pagination
- `/admin/issuances/:id` — Detail, preview, actions (issue/revoke/download)
- `/admin/settings` — Org settings + logo upload

---

## Phase 5 — Public Verification Page (FEAT-004)

**Goal:** Mobile-first, accessible, SSR verification page.

- `/verify/:ref` — Status, document details, signer, disclaimer
- No admin data, no internal IDs, SSR only (works without JavaScript)
- Status badge: ISSUED (green), REVOKED (red), EXPIRED (amber), DRAFT (gray), 404 (not found)

---

## Phase 6 — Tests (FEAT-005)

**Goal:** Comprehensive Vitest test suite covering all acceptance criteria.

Test files:
- `src/lib/__tests__/qr-generator.test.ts`
- `src/lib/__tests__/signature-block-generator.test.ts`
- `src/lib/__tests__/issuance-state.test.ts`
- `src/app/api/__tests__/issuances.test.ts`
- `src/app/api/__tests__/verify.test.ts`
- `src/app/api/__tests__/auth.test.ts`
- `src/app/api/__tests__/issuances-list.test.ts`
- `src/lib/__tests__/audit.test.ts`

---

## Phase 7 — Final Validation & README (FEAT-006)

**Goal:** Green build, passing typecheck and lint, honest test report, complete README.

- `npm run build` → exit 0
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- `npm run test` → report actual pass/fail
- `npx prisma migrate dev` → exit 0
- `npx prisma db seed` → exit 0
- Write `README.md`

---

## Critical Constraints (all phases)

| Constraint | Rule |
|---|---|
| TypeScript | Strict mode; no `any`, no `as any` |
| Timestamps | All UTC; display via `Intl.DateTimeFormat` |
| Public IDs | `nanoid(21)` only; never sequential DB IDs in URLs |
| QR payload | Contains only verification URL; no confidential data |
| Audit log | Append-only; no UPDATE/DELETE on AuditEvent |
| Revoked records | Never deleted; status change only |
| Public endpoint | Must not expose adminNotes, createdById, email, internal IDs |
| Anti-AI-Slop | Score ≥ 42/50 before Phase 4 complete |
| Logo uploads | MIME validation server-side, max 2 MB, normalize to ≤ 300×300 px |
| Design | No dark mode; no glassmorphism; no gradients; navy #1e3a5f primary |
