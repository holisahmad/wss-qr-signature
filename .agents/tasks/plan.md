# Implementation Plan — QR Document Issuance & Verification System

**Product:** WSS QR Signature — institutional QR-based document issuance and public verification  
**Stack:** Next.js 15 App Router · TypeScript strict · Prisma + SQLite → PostgreSQL · NextAuth.js v5 · Tailwind CSS v3 · Vitest  
**Design direction:** Enterprise Information System — restrained, typographically-led, institutional navy palette

---

## Critical constraints (implementers must not deviate)

- TypeScript strict mode everywhere — no `any`, no `as any`
- All timestamps stored as UTC, displayed via `Intl.DateTimeFormat`
- Verification IDs: `nanoid(21)` minimum, never sequential DB IDs in public URLs
- QR payload contains only `{BASE_URL}/verify/{ref}` — no confidential data
- Audit log is append-only — zero UPDATE/DELETE on `AuditEvent`
- Revoked records remain in DB — status change only
- Public verification MUST NOT expose: admin notes, creator email, internal IDs, IP addresses
- No dark mode toggle; clean white/light-gray backgrounds with deep navy primary (`#1e3a5f`)
- Anti-AI-Slop gate: score ≥ 42/50 before marking complete
- Logo uploads: MIME validation server-side, max 2 MB, normalize to ≤ 300×300 px
- ENV vars required: `NEXTAUTH_SECRET`, `DATABASE_URL`, `NEXTAUTH_URL`, `BASE_URL`, `UPLOAD_DIR`

---

## Phase 1 — Project Scaffolding & Documentation

**Goal:** Runnable Next.js project with all dependencies installed and full documentation suite.

- [ ] 1. Scaffold Next.js 15 project with TypeScript, Tailwind CSS v3, ESLint, strict mode.
      Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` inside `/Users/macbookpro/www/wss-qr-signature`. Accept defaults, use App Router.
      Files: package.json, tsconfig.json, tailwind.config.ts, next.config.ts, src/
      Verify: `npm run build` — exits 0 with no TypeScript errors.

- [ ] 2. Install all runtime and dev dependencies in one pass.
      ```
      npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter \
        qrcode @napi-rs/canvas nanoid zod lucide-react sharp
      npm install -D @types/qrcode vitest @vitest/coverage-v8 \
        @testing-library/react @testing-library/user-event \
        @testing-library/jest-dom jsdom
      ```
      Pin exact versions: write `--save-exact` for all installs.
      Files: package.json, package-lock.json
      Verify: `npm ls` — no unmet peer dependencies.

- [ ] 3. Configure Vitest in `vitest.config.ts` with jsdom environment and `@testing-library/jest-dom` setup file.
      Files: vitest.config.ts, src/test/setup.ts
      Verify: `npx vitest run` — exits 0 (no tests yet but config loads).

- [ ] 4. Add npm scripts to package.json: `typecheck`, `test`, `test:coverage`.
      ```json
      "typecheck": "tsc --noEmit",
      "test": "vitest run",
      "test:coverage": "vitest run --coverage"
      ```
      Files: package.json
      Verify: `npm run typecheck` — exits 0.

- [ ] 5. Write documentation suite (8 files). Each must be complete, grounded in actual decisions, not generic boilerplate.
      - `docs/PRD.md` — Product requirements grounded in roadmap
      - `docs/ARCHITECTURE.md` — Next.js App Router structure, API layer, service layer separation
      - `docs/DATABASE_SCHEMA.md` — Full entity relationship docs (write after schema in Phase 2; create stub now)
      - `docs/API_SPEC.md` — All endpoints with request/response shapes
      - `docs/DESIGN_SYSTEM.md` — Filled from UI_Design_Intelligence_Pack/DESIGN_SYSTEM.md template with actual tokens
      - `docs/SECURITY.md` — Auth, RBAC, rate limiting, upload validation, audit policy
      - `docs/IMPLEMENTATION_PLAN.md` — This plan in prose form
      - `docs/DESIGN_DECISIONS.md` — Filled from UI_Design_Intelligence_Pack/DESIGN_DECISIONS.md template
      Files: docs/*.md (8 files)
      Verify: `ls docs/` — 8 files present; `npm run build` still passes.

- [ ] 6. Create `.env.example` with all required variables documented.
      ```
      NEXTAUTH_SECRET=         # required: openssl rand -base64 32
      DATABASE_URL=            # required: file:./dev.db for SQLite dev
      NEXTAUTH_URL=            # required: http://localhost:3000
      BASE_URL=                # required: canonical public URL e.g. https://qr.example.com
      UPLOAD_DIR=              # required: absolute path for logo uploads e.g. /app/uploads
      ```
      Files: .env.example
      Verify: file exists with all 5 vars documented.

---

## Phase 2 — Database & Authentication

**Goal:** Complete Prisma schema, migrations, seed data, and working NextAuth.js admin auth.  
**Depends on:** Phase 1 complete.

- [ ] 7. Initialize Prisma with SQLite for dev.
      `npx prisma init --datasource-provider sqlite`
      Files: prisma/schema.prisma, .env (DATABASE_URL=file:./dev.db added)
      Verify: `npx prisma validate` — exits 0.

- [ ] 8. Write complete Prisma schema with all 8 entities.
      Entities and key fields:
      ```
      User          { id, email, name, passwordHash, role(ADMIN), createdAt, updatedAt }
      Organization  { id, name, slug, logoPath, address, website, createdAt, updatedAt }
      OrganizationalUnit { id, orgId→Organization, name, code, createdAt }
      Signer        { id, orgId→Organization, fullName, title, employeeId, isActive, createdAt, updatedAt }
      DocumentIssuance {
        id, ref(unique nanoid), orgId, unitId?, signerId,
        title, docNumber, docType, description, docDate,
        issuanceTimestamp, expiresAt?,
        status(DRAFT|ISSUED|REVOKED|EXPIRED),
        adminNotes, createdById→User,
        createdAt, updatedAt
      }
      GeneratedAsset { id, issuanceId→DocumentIssuance, type(QR_PNG|SIGNATURE_BLOCK), filePath, fileSize, mimeType, createdAt }
      IssuanceStatusHistory { id, issuanceId, fromStatus, toStatus, reason?, actorId→User, createdAt }
      AuditEvent { id, actorId?, action, entityType, entityId, meta(Json), ipAddress?, createdAt }
      ```
      All foreign keys have explicit `onDelete` behavior. All timestamps default to `now()`.
      Files: prisma/schema.prisma
      Verify: `npx prisma validate` — exits 0; `npx prisma format` — no changes.

- [ ] 9. Create initial migration and generate Prisma client.
      `npx prisma migrate dev --name init`
      `npx prisma generate`
      Files: prisma/migrations/*, prisma/dev.db
      Verify: `npx prisma studio` opens without errors (manual spot-check); `npm run typecheck` passes.

- [ ] 10. Write database seed script with realistic test data.
      Contents: 1 admin user (bcrypt-hashed), 1 organization, 1 unit, 2 signers, 3 issuances (1 DRAFT, 1 ISSUED, 1 REVOKED), 3 audit events.
      Files: prisma/seed.ts, package.json (add `"prisma": { "seed": "npx ts-node prisma/seed.ts" }`)
      Verify: `npx prisma db seed` — exits 0; `npx prisma studio` shows seeded rows.

- [ ] 11. Create Prisma client singleton for Next.js (avoids hot-reload connection exhaustion).
      Files: src/lib/db.ts
      Pattern: global singleton with `global.__prisma` guard.
      Verify: `npm run typecheck` — exits 0.

- [ ] 12. Configure NextAuth.js v5 with credentials provider.
      - `src/auth.ts` — NextAuth config: credentials provider, PrismaAdapter, session strategy JWT
      - `src/app/api/auth/[...nextauth]/route.ts` — Route handler
      - Credentials provider: find User by email, compare bcrypt hash, return `{ id, email, name, role }`
      - Session augmented with `role` (add to `next-auth.d.ts` type extension)
      Files: src/auth.ts, src/app/api/auth/[...nextauth]/route.ts, src/types/next-auth.d.ts
      Verify: `npm run typecheck` — exits 0.

- [ ] 13. Write Next.js middleware for admin route protection.
      Protect all `/admin/*` routes: unauthenticated requests redirect to `/sign-in`.
      Files: src/middleware.ts
      Verify: `npm run build` passes; `npm run typecheck` passes.

- [ ] 14. Write authorization helper and role-check utilities.
      `src/lib/auth-utils.ts`: `requireAdmin(req)` throws 401/403, `getServerSession()` wrapper.
      Files: src/lib/auth-utils.ts
      Verify: `npm run typecheck` — exits 0.

---

## Phase 3 — Core API Routes

**Goal:** All 10 API endpoints implemented with Zod validation, auth, audit events, consistent error format.  
**Depends on:** Phase 2 complete.

**Consistent error response shape for all endpoints:**
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

**Audit event on every mutating endpoint.**

- [ ] 15. Create shared API utilities.
      - `src/lib/api-response.ts` — `apiSuccess(data)`, `apiError(code, msg, status)`, `apiValidationError(issues)`
      - `src/lib/rate-limit.ts` — In-memory sliding window rate limiter (no Redis required for MVP); 30 req/min per IP for public endpoints
      - `src/lib/audit.ts` — `writeAuditEvent(action, entityType, entityId, actorId?, meta?, ip?)` — append-only, never throws
      Files: src/lib/api-response.ts, src/lib/rate-limit.ts, src/lib/audit.ts
      Verify: `npm run typecheck` — exits 0.

- [ ] 16. POST /api/issuances — Create DRAFT issuance.
      - Zod schema: all required fields, duplicate detection on `docNumber + orgId`
      - Generates `ref` via `nanoid(21)`
      - Returns 201 with new issuance
      - Writes AuditEvent `ISSUANCE_CREATED`
      Files: src/app/api/issuances/route.ts, src/lib/schemas/issuance.ts
      Verify: `npm run typecheck`; integration test in Phase 7.

- [ ] 17. GET /api/issuances — List with pagination, search, filters.
      - Query params: `page`, `limit` (max 100), `search`, `status`, `orgId`, `unitId`, `dateFrom`, `dateTo`, `sort`
      - Returns `{ data: [], total, page, limit }`
      - Admin-only
      Files: src/app/api/issuances/route.ts (GET handler in same file)
      Verify: `npm run typecheck`; tested in Phase 7.

- [ ] 18. GET /api/issuances/[id] — Get detail by database ID (admin only).
      - Returns full issuance with org, unit, signer, assets, status history
      Files: src/app/api/issuances/[id]/route.ts
      Verify: `npm run typecheck`.

- [ ] 19. PATCH /api/issuances/[id] — Update metadata (DRAFT only; ISSUED records are immutable except status).
      - Zod schema for partial update
      - Writes AuditEvent `ISSUANCE_UPDATED`
      Files: src/app/api/issuances/[id]/route.ts (PATCH handler)
      Verify: `npm run typecheck`.

- [ ] 20. POST /api/issuances/[id]/issue — Transition DRAFT → ISSUED, generate QR + PNG.
      - Calls `generateQR(ref, logoPath?)` → PNG buffer
      - Calls `generateSignatureBlock(issuance, qrBuffer)` → PNG buffer
      - Saves both files to `UPLOAD_DIR/assets/`
      - Creates GeneratedAsset rows
      - Transitions status DRAFT → ISSUED via IssuanceStatusHistory
      - Writes AuditEvent `ISSUANCE_ISSUED`
      - Transactional: if any step fails, no state change is persisted
      Files: src/app/api/issuances/[id]/issue/route.ts
      Verify: `npm run typecheck`; full integration test in Phase 7.

- [ ] 21. POST /api/issuances/[id]/revoke — Transition ISSUED → REVOKED with mandatory reason.
      - Reason required (min 10 chars)
      - Writes IssuanceStatusHistory + AuditEvent `ISSUANCE_REVOKED`
      - Does NOT delete assets
      Files: src/app/api/issuances/[id]/revoke/route.ts
      Verify: `npm run typecheck`.

- [ ] 22. GET /api/verify/[ref] — PUBLIC verification endpoint.
      - Rate-limited: 30 req/min per IP
      - Looks up by `ref` field (NOT database ID)
      - Returns only public-safe fields: org name, doc title/number/type, doc date, issuance timestamp, signer name/title, unit name, status, ref
      - Does NOT return: adminNotes, createdById, any email, internal IDs
      - Returns 404 for unknown refs (no information leakage)
      Files: src/app/api/verify/[ref]/route.ts
      Verify: `npm run typecheck`; authorization test in Phase 7.

- [ ] 23. POST /api/organizations and GET /api/organizations — Create/list orgs.
      Files: src/app/api/organizations/route.ts
      Verify: `npm run typecheck`.

- [ ] 24. POST /api/organizations/[id]/logo — Upload and normalize org logo.
      - Validate MIME: `image/png`, `image/jpeg`, `image/svg+xml` only
      - Max 2 MB enforced server-side
      - Resize/normalize to ≤ 300×300 px using `sharp`
      - Save to `UPLOAD_DIR/logos/`
      - Update `Organization.logoPath`
      - Write AuditEvent `LOGO_UPLOADED`
      Files: src/app/api/organizations/[id]/logo/route.ts
      Verify: `npm run typecheck`.

- [ ] 25. GET /api/issuances/[id]/assets/[assetId] — Serve generated asset (admin-only download).
      - Reads file from disk, streams response with correct Content-Type
      Files: src/app/api/issuances/[id]/assets/[assetId]/route.ts
      Verify: `npm run typecheck`.

---

## Phase 4 — QR & PNG Generation Service

**Goal:** Production-quality QR with logo overlay, validated for scannability; print-ready 800×200 px signature block.  
**Depends on:** Phase 2 (Prisma types), Phase 1 (deps installed).

- [ ] 26. Implement `src/lib/qr-generator.ts`.
      ```typescript
      // Interface:
      export async function generateQR(
        verificationUrl: string,
        logoPath?: string | null
      ): Promise<Buffer>
      ```
      Steps:
      1. Generate QR at high resolution (800×800 px) with error correction `H` (allows 30% damage) using `qrcode` package.
      2. If `logoPath` provided: use `sharp` to resize logo to 160×160 px, add 8 px white padding (total 176×176), overlay centered on QR image.
      3. Validate the result is scannable: decode with `qrcode` reader or a JS-only decoder. If decode fails, fall back to QR without logo.
      4. Return final PNG buffer.
      Files: src/lib/qr-generator.ts
      Verify: `npx vitest run src/lib/qr-generator` — tests pass (Phase 7 writes them; implement in tandem).

- [ ] 27. Implement `src/lib/signature-block-generator.ts`.
      ```typescript
      export async function generateSignatureBlock(
        issuance: IssuanceWithRelations,
        qrBuffer: Buffer,
        opts?: { width?: number; height?: number; background?: 'white' | 'transparent' }
      ): Promise<Buffer>
      ```
      Layout (800×200 px default, scalable):
      ```
      [ ORG LOGO 160×160 ] | [ QR 160×160 ] | [ METADATA TEXT COLUMN ]
      ```
      Metadata column content (top to bottom):
      - Organization name (bold, 14 px)
      - Doc title (12 px, truncate at 60 chars)
      - Doc number (10 px, monospace-style)
      - Signer: "{fullName} — {title}" (10 px)
      - Verification date: ISO date (10 px)
      - Ref: "{ref}" (9 px, muted)
      High contrast: black text on white background. Use `@napi-rs/canvas` for text rendering.
      Files: src/lib/signature-block-generator.ts
      Verify: `npx vitest run src/lib/signature-block-generator` — output buffer is valid PNG ≥ 10 KB.

---

## Phase 5 — Admin Dashboard UI

**Goal:** Complete, functional admin interface with Enterprise Information System design. Anti-AI-Slop score ≥ 42/50.  
**Design system already decided:** Deep navy `#1e3a5f`, white/gray backgrounds, Inter font stack, no glassmorphism, no gradients, no decorative blobs.  
**Depends on:** Phase 3 complete (all API routes exist).

**Build shared UI primitives first, then pages.**

- [ ] 28. Implement Tailwind design tokens in `tailwind.config.ts` and `src/app/globals.css`.
      Tokens (as CSS custom properties):
      ```css
      --color-brand: #1e3a5f;
      --color-brand-hover: #2d5a8e;
      --color-accent: #2563eb;
      --color-background: #f8f9fa;
      --color-surface: #ffffff;
      --color-text-primary: #111827;
      --color-text-secondary: #6b7280;
      --color-border: #e5e7eb;
      --color-success: #15803d;
      --color-warning: #b45309;
      --color-danger: #dc2626;
      --color-info: #1d4ed8;
      ```
      Tailwind extend: map tokens, set `fontFamily.sans` to `['Inter', 'ui-sans-serif', 'system-ui']`.
      Files: tailwind.config.ts, src/app/globals.css
      Verify: `npm run build` — exits 0.

- [ ] 29. Build shared UI component library (reusable across all admin pages).
      Components to create:
      - `src/components/ui/Button.tsx` — variants: primary/secondary/danger/ghost; sizes: sm/md/lg; loading state; accessible
      - `src/components/ui/Input.tsx` — label, error message, helper text; controlled; accessible
      - `src/components/ui/Select.tsx` — native select with label + error
      - `src/components/ui/Badge.tsx` — status badge: ISSUED(green)/REVOKED(red)/EXPIRED(amber)/DRAFT(gray) — text + color, never color alone
      - `src/components/ui/DataTable.tsx` — sortable headers, pagination controls, loading skeleton, empty state
      - `src/components/ui/PageHeader.tsx` — title + optional subtitle + action slot
      - `src/components/ui/Card.tsx` — used only when grouping genuinely improves comprehension; no decorative use
      - `src/components/ui/Dialog.tsx` — accessible modal: focus trap, Escape closes, aria-labelledby
      - `src/components/ui/Toast.tsx` — success/error/info notifications
      - `src/components/layout/AdminLayout.tsx` — sidebar nav + content area; nav items: Dashboard, Issuances, New Issuance, Settings
      All lucide-react icons have `aria-label` or are `aria-hidden` with adjacent visible label text.
      Files: src/components/ui/*.tsx, src/components/layout/AdminLayout.tsx
      Verify: `npm run typecheck` and `npm run build` — exits 0.

- [ ] 30. Sign-in page `/sign-in`.
      - Clean, centered card (no hero, no gradient background)
      - Email + password inputs, submit button with loading state
      - Error: "Invalid credentials" on auth failure — no detail leakage
      - Redirect to `/admin` on success
      - Server action or client fetch to NextAuth `signIn`
      Files: src/app/sign-in/page.tsx, src/app/sign-in/SignInForm.tsx
      Verify: `npm run build` passes; `npm run typecheck` passes.

- [ ] 31. Admin dashboard `/admin` — stats overview and quick actions.
      - Key metrics pulled from real DB counts: Total Issued, Total Revoked, Issued This Month, Total Documents
      - NO fake charts, NO fake activity feed
      - Quick action: "New Issuance" button → `/admin/issuances/new`
      - Recent 5 issuances list (link to detail)
      Files: src/app/admin/page.tsx, src/app/admin/DashboardStats.tsx
      Verify: `npm run build` passes; page renders real counts from DB via server component.

- [ ] 32. New Issuance form `/admin/issuances/new`.
      - All fields from roadmap §2 Step 2: title, docNumber, docType, description, orgId, unitId, signerId, docDate, issuance timestamp, optional adminNotes
      - Client-side Zod validation with field-level errors
      - Duplicate prevention: warn if docNumber already exists for the org
      - Submit: POST /api/issuances → on success redirect to `/admin/issuances/[id]`
      - Signer/org selects populated from API
      Files: src/app/admin/issuances/new/page.tsx, src/app/admin/issuances/new/IssuanceForm.tsx
      Verify: `npm run build` passes.

- [ ] 33. Issuance detail & preview page `/admin/issuances/[id]`.
      - Full record display: all fields, status badge, status history timeline
      - PNG signature block preview (img tag pointing to asset API)
      - Action buttons by status:
        - DRAFT: "Issue" (triggers POST /issue → generates QR + PNG), "Edit", "Delete"
        - ISSUED: "Download PNG", "Copy Verification URL", "Open Public Page", "Revoke" (opens confirmation dialog with required reason)
        - REVOKED: "View", revocation details, re-issue option (creates new draft)
      - Audit timeline (last 10 events for this record)
      Files: src/app/admin/issuances/[id]/page.tsx, src/app/admin/issuances/[id]/IssuanceActions.tsx, src/app/admin/issuances/[id]/AuditTimeline.tsx
      Verify: `npm run build` passes; `npm run typecheck` passes.

- [ ] 34. Archive/list page `/admin/issuances`.
      - Paginated table: title, doc number, signer, org, status badge, date, actions column
      - Search bar (searches title, docNumber, signer name, ref)
      - Filters: status dropdown, org dropdown, date range (from/to)
      - Sort: newest/oldest/title/docNumber
      - URL query params sync (share-able filtered URLs)
      - Empty state: "No issuances found. Create your first one."
      Files: src/app/admin/issuances/page.tsx, src/app/admin/issuances/IssuanceTable.tsx, src/app/admin/issuances/IssuanceFilters.tsx
      Verify: `npm run build` passes; filters change displayed rows.

- [ ] 35. Organization settings page `/admin/settings`.
      - Organization name, address, website fields
      - Logo upload: drag-to-upload or file input, preview after upload, POST /api/organizations/[id]/logo
      - Client-side MIME + size pre-validation (≤2MB) before sending
      - Logo preview regeneration notice: "Re-issue documents to update their signature blocks"
      Files: src/app/admin/settings/page.tsx, src/app/admin/settings/OrgForm.tsx, src/app/admin/settings/LogoUpload.tsx
      Verify: `npm run build` passes.

---

## Phase 6 — Public Verification Page

**Goal:** Mobile-first, accessible, server-side rendered verification page with truthful status display.  
**Depends on:** Phase 3 (GET /api/verify/[ref]), Phase 5 (design tokens in place).

- [ ] 36. Public verification page `/verify/[ref]`.
      SSR only — works without JavaScript.
      Layout:
      ```
      ┌─────────────────────────────────────┐
      │ [ORG LOGO]   Organization Name      │  ← header
      │              QR Document Verification│
      ├─────────────────────────────────────┤
      │ STATUS: [ISSUED ✓]                  │  ← large, clear status badge
      ├─────────────────────────────────────┤
      │ Document Title                      │
      │ Document Number    Document Type    │
      │ Document Date      Issued At        │
      │ Signer             Title            │
      │ Department         Organization     │
      │ Verification Ref   [copy button]    │
      ├─────────────────────────────────────┤
      │ ⚠ This verifies the issuance        │
      │   record only. It does not verify   │
      │   the integrity of the document     │
      │   file itself.                      │
      └─────────────────────────────────────┘
      ```
      Status badge semantics:
      - ISSUED: green background + "✓ Issued" text
      - REVOKED: red background + "✗ Revoked" + revocation date
      - EXPIRED: amber background + "⚠ Expired" + expiry date
      - DRAFT: gray background + "Draft — Not Issued" (should never appear in prod via public URL but handle defensively)
      - 404/invalid: show "Verification record not found" — no technical details
      Rate limited via middleware (30 req/min/IP).
      No admin data, no internal IDs, no creator email.
      Files: src/app/verify/[ref]/page.tsx, src/app/verify/[ref]/VerificationCard.tsx, src/app/verify/[ref]/StatusBadge.tsx
      Verify: `npm run build` passes; `npm run typecheck` passes; manually load `/verify/{valid-ref}` and verify SSR HTML contains document details.

---

## Phase 7 — Tests

**Goal:** Comprehensive Vitest test suite covering all acceptance criteria from roadmap §10.  
**Depends on:** Phases 4, 5, 6 — tests import the actual implementations.

- [ ] 37. QR generation tests — `src/lib/__tests__/qr-generator.test.ts`.
      Tests:
      1. Generates a valid PNG buffer without logo
      2. Generates a valid PNG buffer with logo (mock logo file)
      3. Output can be decoded to the expected URL (use `jsQR` or similar)
      4. Falls back to no-logo if overlay corrupts QR (inject a logo that would cause scan failure)
      Files: src/lib/__tests__/qr-generator.test.ts
      Verify: `npx vitest run src/lib/__tests__/qr-generator.test.ts` — all pass.

- [ ] 38. Signature block generation tests — `src/lib/__tests__/signature-block-generator.test.ts`.
      Tests:
      1. Generates a buffer that is a valid PNG
      2. Output dimensions match default 800×200
      3. Custom dimensions are respected
      4. Handles missing logo path gracefully
      Files: src/lib/__tests__/signature-block-generator.test.ts
      Verify: `npx vitest run src/lib/__tests__/signature-block-generator.test.ts` — all pass.

- [ ] 39. Issuance state machine tests — `src/lib/__tests__/issuance-state.test.ts`.
      Tests:
      1. DRAFT → ISSUED is allowed
      2. DRAFT → REVOKED is NOT allowed
      3. ISSUED → REVOKED is allowed (with reason)
      4. REVOKED → any transition is NOT allowed
      5. ISSUED → EXPIRED is allowed (via scheduled job or explicit set)
      Write a pure state machine helper `src/lib/issuance-state-machine.ts` if not already created, import it here.
      Files: src/lib/issuance-state-machine.ts, src/lib/__tests__/issuance-state.test.ts
      Verify: `npx vitest run src/lib/__tests__/issuance-state.test.ts` — all pass.

- [ ] 40. API route integration tests — `src/app/api/__tests__/issuances.test.ts`.
      Mock Prisma via `vi.mock('../../../lib/db')`.
      Tests:
      1. POST /api/issuances — 201 on valid payload; 422 on invalid; 401 if unauthenticated
      2. POST /api/issuances/[id]/issue — 200 with asset URLs; 409 if already ISSUED; 401 if unauthenticated
      3. POST /api/issuances/[id]/revoke — 200; 400 if reason missing; 401 if unauthenticated
      4. GET /api/verify/[ref] — returns public fields; does NOT return adminNotes, createdById
      5. GET /api/verify/[ref] — 404 for unknown ref
      Files: src/app/api/__tests__/issuances.test.ts, src/app/api/__tests__/verify.test.ts
      Verify: `npx vitest run src/app/api/__tests__/` — all pass.

- [ ] 41. Authorization tests — `src/app/api/__tests__/auth.test.ts`.
      Tests:
      1. GET /admin redirects unauthenticated requests to /sign-in (middleware test)
      2. POST /api/issuances returns 401 with no session
      3. GET /api/verify/[ref] returns 200 for unauthenticated requests (public endpoint)
      4. Rate limiter blocks 31st request within 1 minute from same IP
      Files: src/app/api/__tests__/auth.test.ts
      Verify: `npx vitest run src/app/api/__tests__/auth.test.ts` — all pass.

- [ ] 42. Archive search and filter tests — `src/app/api/__tests__/issuances-list.test.ts`.
      Tests:
      1. Search query filters by title match
      2. Status filter returns only matching status
      3. Date range filter works correctly
      4. Pagination returns correct page and total count
      5. Sort by newest returns descending createdAt order
      Files: src/app/api/__tests__/issuances-list.test.ts
      Verify: `npx vitest run src/app/api/__tests__/issuances-list.test.ts` — all pass.

- [ ] 43. Audit log tests — `src/lib/__tests__/audit.test.ts`.
      Tests:
      1. `writeAuditEvent` creates a record in DB
      2. Audit records cannot be updated (attempt UPDATE should fail or be rejected by helper)
      3. Audit records cannot be deleted (attempt DELETE should fail or be rejected by helper)
      Files: src/lib/__tests__/audit.test.ts
      Verify: `npx vitest run src/lib/__tests__/audit.test.ts` — all pass.

---

## Phase 8 — Final Validation & README

**Goal:** Green build, passing typecheck, passing lint, honest test report, complete README.  
**Depends on:** All phases complete.

- [ ] 44. Run full build pipeline, fix all errors.
      ```bash
      npm run build       # must exit 0
      npm run typecheck   # must exit 0
      npm run lint        # must exit 0
      npm run test        # report actual pass/fail count
      ```
      Fix every TypeScript error, lint error, and test failure before proceeding.
      Files: any file that has errors
      Verify: all four commands exit 0.

- [ ] 45. Run fresh DB migration and seed.
      ```bash
      npx prisma migrate dev
      npx prisma db seed
      ```
      Verify: seed exits 0; `npx prisma studio` shows all seed data.

- [ ] 46. Write README.md.
      Sections:
      1. Project overview (2-3 sentences)
      2. Prerequisites (Node 20+, npm)
      3. Local development setup (clone, npm install, .env, migrate, seed, npm run dev)
      4. Environment variables table (all 5 vars with description and example)
      5. Running tests (`npm run test`, `npm run test:coverage`)
      6. Building for production (`npm run build`)
      7. Database commands (migrate, seed, studio)
      8. Architecture overview (brief, reference docs/ARCHITECTURE.md)
      9. Security notes (brief, reference docs/SECURITY.md)
      Files: README.md
      Verify: `npm run build` still passes after README creation.

---

## Interdependencies & Risk Notes

| Risk | Mitigation |
|---|---|
| `@napi-rs/canvas` binary compilation on macOS arm64 | Pinned version; if compilation fails use `canvas` (node-canvas) as fallback — identical API |
| QR logo overlay degrades scannability | Error correction H (30% tolerance) + automated decode validation in `generateQR` + no-logo fallback |
| NextAuth.js v5 beta API changes | Use only documented stable patterns; avoid experimental features |
| SQLite → PostgreSQL migration | All Prisma schema types are PostgreSQL-compatible; only `DateTime` and `Json` fields need attention |
| File system uploads in Next.js | `UPLOAD_DIR` env var required; `src/app/api/organizations/[id]/logo/route.ts` uses Node.js `fs.writeFile` directly — not `formidable` |
| Rate limiting in-memory | Resets on server restart; sufficient for MVP — note in docs |

## Acceptance criteria summary

| Phase | Done when |
|---|---|
| 1 | `npm run build` + `npm run typecheck` exit 0; all 8 docs files exist |
| 2 | `npx prisma migrate dev` + `npx prisma db seed` exit 0; middleware blocks unauthenticated /admin |
| 3 | All 10 endpoints respond correctly; `npm run typecheck` passes |
| 4 | QR buffer decodes to correct URL; PNG buffer is valid ≥ 10 KB |
| 5 | All 6 admin pages render; no fake data; all controls functional; no broken TypeScript |
| 6 | /verify/[ref] renders SSR; correct status badge; no admin data exposed |
| 7 | All test files pass: `npm run test` green |
| 8 | All 4 commands exit 0; README covers all setup steps |
