# Product Requirements Document — WSS QR Signature

**Version:** 1.0.0  
**Status:** Active  
**Product:** WSS QR Document Issuance & Verification System  
**Stack:** Next.js 15 App Router · TypeScript strict · Prisma + SQLite (dev) / PostgreSQL (prod) · NextAuth.js v5 · Tailwind CSS v4  

---

## 1. Product Overview

WSS QR Signature is a production-minded web application for issuing, identifying, verifying, and archiving official documents using QR-based signature blocks.

The system provides four primary capabilities:

1. An authenticated admin dashboard for creating document issuance records and triggering automatic QR code and signature block generation.
2. A high-resolution, print-ready PNG signature block containing the organization logo, QR code, signer identity, and document reference.
3. A public QR verification page that displays the authoritative issuance record without exposing private data.
4. A centralized, searchable archive of all issued, revoked, and expired document records.

This is not a generic QR-code generator. It is a document issuance and verification system designed to support official organizational workflows.

---

## 2. Problem Statement

Organizations that issue official documents (certificates, letters, permits, attestations) lack a simple, verifiable way to confirm that a document's claimed issuance is authentic. Paper-based or PDF-only workflows provide no efficient mechanism for third-party verification.

WSS QR Signature solves this by embedding a scannable QR code in each document's signature block. Scanning the QR navigates to the public verification page for that specific issuance record, allowing anyone to confirm:

- That the issuing organization recognizes this document
- That the stated signer and document details match the official record
- The current status: issued, revoked, or expired

**Important:** The system verifies the issuance record, not the integrity of any document file. This distinction must be displayed truthfully on the verification page.

---

## 3. Users and Roles

### Administrator
An authorized staff member of the issuing organization who:
- Signs in to the admin dashboard
- Creates document issuance records
- Triggers QR and signature block generation
- Downloads the generated PNG
- Manages the archive and can revoke records
- Configures the organization profile and logo

### Verifier (public, unauthenticated)
Any person who scans a QR code on a document or navigates directly to a verification URL, who:
- Views the public verification page
- Sees the document status and publicly approved details
- Does not need an account

---

## 4. Mandatory User Journey

### Step 1 — Admin Authentication
An authorized administrator navigates to `/sign-in` and provides their email and password. On success they are redirected to `/admin`.

### Step 2 — Create Document Issuance Record
From `/admin/issuances/new`, the admin enters:
- Document title (required)
- Document number (required, unique per organization)
- Document type / category (required)
- Document description / subject (optional)
- Issuing organization (required, selected from configured orgs)
- Department / organizational unit (optional)
- Signer's full name (required, selected from configured signers)
- Signer's official title/position (auto-filled from signer record)
- Employee ID or official identifier (auto-filled from signer record, when set)
- Document date (required)
- Issuance / signing timestamp (required, defaults to now)
- Admin notes (internal, never shown publicly, optional)

The system validates required fields and warns if the document number already exists for the same organization.

### Step 3 — Generate QR and Signature Block
When the admin confirms issuance:
1. A unique, non-guessable 21-character reference ID (`nanoid(21)`) is generated.
2. The issuance record is persisted in the database with status `ISSUED`.
3. A QR code is generated from the canonical verification URL: `{BASE_URL}/verify/{ref}`.
4. The organization logo is overlaid at the QR center using 30% error correction tolerance.
5. A high-resolution PNG signature block (800×200 px default) is generated with org logo, QR, and document metadata.
6. Both assets are saved to disk and linked to the issuance record.
7. An audit event is recorded.

If any step in the generation pipeline fails, no status change is persisted (transactional).

### Step 4 — Download and Use
From the issuance detail page, the admin can:
- Preview the signature block PNG
- Download the PNG for embedding in documents
- Copy the verification URL
- Open the public verification page

### Step 5 — Scan and Verify
Anyone scanning the QR opens `/verify/{ref}` and sees:
- Organization name and logo
- Verification status (ISSUED, REVOKED, EXPIRED)
- Document title and number
- Document type
- Document date
- Issuance timestamp
- Signer's full name and title
- Department / organizational unit
- Issuing organization
- Unique verification reference
- Clear disclaimer that this verifies the issuance record, not document file integrity

---

## 5. Issuance State Machine

```
DRAFT  ──── issue ────▶  ISSUED  ──── revoke ────▶  REVOKED
                           │
                           └─── expire ────▶  EXPIRED
```

- **DRAFT**: record exists; QR not yet generated
- **ISSUED**: QR generated, record is valid
- **REVOKED**: record has been explicitly revoked; original assets remain
- **EXPIRED**: validity period has ended (future automated transition)

Invalid transitions:
- DRAFT → REVOKED (not allowed; must issue first)
- REVOKED → any (terminal state)
- EXPIRED → any (terminal state)

---

## 6. Archive Requirements

- Paginated list (20 per page default)
- Full-text search: title, document number, signer name, verification reference
- Filters: status, organization, department, date range
- Sort: newest, oldest, title, document number
- Export: verification URL copy per row
- Issued records cannot be silently modified or deleted
- Amendments require explicit reissuance workflow (future feature)

---

## 7. Security Requirements

- Admin authentication via email + bcrypt-hashed password (NextAuth.js v5, credentials provider)
- All admin routes protected by middleware
- Public verification endpoint rate-limited (30 req/min per IP)
- Server-side input validation with Zod
- Logo uploads: MIME whitelist (PNG, JPEG, SVG), max 2 MB, normalized to ≤ 300×300 px
- No database IDs or secrets in public URLs
- Audit log for all mutating actions; append-only

---

## 8. Out of Scope for MVP

- PDF upload or file hash verification
- Cryptographic document signing or certificate authority integration
- Multi-tenant billing
- Automated expiry scheduling (manual expiry transition only)
- Complex multi-step approval workflows
- OCR or AI document extraction

---

## 9. Acceptance Criteria

1. Admin can create an issuance record.
2. Issuing a record generates a unique verification URL, QR, and PNG.
3. Organization logo appears centered in QR; QR remains scannable.
4. Generated PNG is readable at document print scale.
5. Scanning the QR opens the correct public verification page.
6. Public page displays correct document and signer details.
7. DRAFT, ISSUED, REVOKED, and EXPIRED states are handled correctly.
8. Revoked records remain accessible with clear status.
9. Every issuance appears in the archive and can be searched and filtered.
10. Issued records cannot be silently modified or deleted.
11. All mutating actions are written to the audit log.
12. Unauthorized users cannot access admin routes.
13. Public pages do not expose admin notes, creator email, or internal IDs.
14. Automated tests cover issuance, QR generation, verification, revocation, auth, and archive search.
