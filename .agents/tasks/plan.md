# Implementation Plan — Fix Issues: Prerender Error, Audit Log, Signer CRUD

**Task:** Four grouped fixes on the running WSS QR Signature app:
1. Sign-in page blocking prerender error (Next.js 16.x `connection()` outside Suspense)
2. Credentials security verification (form must not expose creds in URL)
3. Audit log: LOGIN/LOGOUT/SIGNER_* events, 60-day retention, audit viewer page
4. Signer CRUD with soft delete and updated dropdown

**Decomposition:** Decomposed into 4 FEATs. See `/Users/macbookpro/www/wss-qr-signature/.agents/tasks/fix-issues/` for FEAT files.

---

## Quick reference — what was found in the codebase

| Item | Finding |
|---|---|
| `sign-in/page.tsx` | Has `await connection()` + `await auth()` — both must be removed |
| `SignInForm.tsx` | Already secure: uses `signIn('credentials', { redirect: false })`, POST body only, no URL params |
| `auth.ts` | No LOGIN/LOGOUT audit events written; NextAuth callbacks exist but no `writeAuditEvent` calls |
| `Signer` model | No `deletedAt` field — needs migration `add-signer-soft-delete` |
| `/api/organizations/[id]/signers` | Only shows `isActive: true` but does NOT filter `deletedAt IS NULL` |
| `IssuanceActions.tsx` | Revoke dialog already requires reason ≥ 10 chars — **already done** |
| `AdminLayout.tsx` | Only has Dashboard, Issuances, New Issuance, Settings — missing Signers + Audit Log |
| `AuditEvent` model | Has `createdAt` with `@@index([createdAt])` — cleanup query is straightforward |
| Audit events written | `ISSUANCE_CREATED`, `ISSUANCE_ISSUED`, `ISSUANCE_REVOKED` — SIGNER_* and LOGIN/LOGOUT are missing |

---

## FEAT Order

1. **FEAT-F01** — Fix sign-in prerender error (trivial, unblocks build)
2. **FEAT-F02** — Signer model soft-delete migration + updated API routes + CRUD UI
3. **FEAT-F03** — Audit log: LOGIN/LOGOUT/SIGNER_* events + 60-day cleanup route
4. **FEAT-F04** — Audit log viewer page at /admin/audit + sidebar nav items

---

- [ ] 1. Fix `src/app/sign-in/page.tsx` — remove `connection()` and `await auth()` redirect check.
      The page becomes a simple static server component; redirect-if-logged-in is handled by middleware.
      Files: `src/app/sign-in/page.tsx`
      Verify: `npm run build` exits 0, `npm run typecheck` exits 0.

- [ ] 2. Add `deletedAt DateTime?` to `Signer` in Prisma schema and run migration.
      Files: `prisma/schema.prisma`
      Verify: `npx prisma migrate dev --name add-signer-soft-delete` exits 0; `npx prisma generate` exits 0.

- [ ] 3. Create signer Zod schema at `src/lib/schemas/signer.ts`.
      Exports: `CreateSignerSchema`, `UpdateSignerSchema`.
      Files: `src/lib/schemas/signer.ts`
      Verify: `npm run typecheck` exits 0.

- [ ] 4. Create signer API routes.
      - `GET /api/signers` — list with `orgId`, `search`, `page`, `limit`, excludes `deletedAt IS NOT NULL`
      - `POST /api/signers` — create + write `SIGNER_CREATED` audit event
      - `PATCH /api/signers/[id]` — update + write `SIGNER_UPDATED` audit event
      - `DELETE /api/signers/[id]` — soft delete (set `deletedAt`, `isActive=false`) + write `SIGNER_DELETED` audit event
      Files: `src/app/api/signers/route.ts`, `src/app/api/signers/[id]/route.ts`
      Verify: `npm run typecheck` exits 0, `npm run build` exits 0.

- [ ] 5. Update `GET /api/organizations/[id]/signers` to also filter `deletedAt: null`.
      Files: `src/app/api/organizations/[id]/signers/route.ts`
      Verify: `npm run typecheck` exits 0.

- [ ] 6. Create signer CRUD page at `/admin/signers/page.tsx` with `SignersClient.tsx` client component.
      List view with DataTable, Add/Edit Dialog, soft-delete confirmation Dialog.
      Files: `src/app/admin/signers/page.tsx`, `src/app/admin/signers/SignersClient.tsx`
      Verify: `npm run build` exits 0, `npm run typecheck` exits 0.

- [ ] 7. Add LOGIN/LOGOUT audit events to `src/auth.ts` NextAuth callbacks.
      In `events.signIn` callback: call `writeAuditEvent({ action:'LOGIN', ... })`.
      In `events.signOut` callback: call `writeAuditEvent({ action:'LOGOUT', ... })`.
      Files: `src/auth.ts`
      Verify: `npm run typecheck` exits 0.

- [ ] 8. Create audit cleanup route `POST /api/admin/audit/cleanup`.
      Deletes `AuditEvent` records where `createdAt < now - 60 days`.
      Files: `src/app/api/admin/audit/cleanup/route.ts`
      Verify: `npm run typecheck` exits 0, `npm run build` exits 0.

- [ ] 9. Create audit log page at `/admin/audit` with server component and `AuditLogClient.tsx`.
      Paginated DataTable with columns: timestamp, actor, action, entity type, entity ID.
      Filter by action type and date range. Data capped at 60 days.
      Files: `src/app/admin/audit/page.tsx`, `src/app/admin/audit/AuditLogClient.tsx`
      Verify: `npm run build` exits 0, `npm run typecheck` exits 0.

- [ ] 10. Create audit log API route `GET /api/admin/audit`.
      Query params: `page`, `limit`, `action`, `dateFrom`, `dateTo`, `actorId`.
      Always filters `createdAt >= now - 60 days`.
      Files: `src/app/api/admin/audit/route.ts`
      Verify: `npm run typecheck` exits 0.

- [ ] 11. Update `AdminLayout.tsx` to add Signers and Audit Log nav items.
      Signers item uses `Users` icon between Issuances and Settings.
      Audit Log item uses `History` icon after Signers.
      Files: `src/components/layout/AdminLayout.tsx`
      Verify: `npm run build` exits 0, `npm run lint` exits 0.

- [ ] 12. Final verification pass.
      Verify: `npm run build` exits 0, `npm run typecheck` exits 0, `npm run lint` exits 0, `npm run test` exits 0.
