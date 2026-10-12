# MVP SCOPE OVERRIDE — QR DOCUMENT ISSUANCE & VERIFICATION SYSTEM

## 1. Product Objective

Build a production-minded web application for issuing, identifying, verifying, and archiving official documents using QR-based signature blocks.

The application must provide four primary capabilities:

1. An authenticated admin dashboard for issuing document records and generating QR codes automatically.
2. A high-quality, print-ready PNG signature block containing a company or institution logo, QR code, signer identity, and relevant document reference.
3. A public QR verification page displaying the authoritative issuance record.
4. A centralized, searchable archive of all issued, revoked, and expired document records.

This is an MVP, but its architecture must support future integration with certified electronic signatures and cryptographic document-integrity verification.

Do not build a generic QR-code generator. Build a document issuance and verification system.

## 2. Mandatory User Journey

### Step 1 — Admin Authentication

An authorized administrator signs in and opens the issuance dashboard.

### Step 2 — Create Document Issuance Record

The admin enters:

- Document title
- Document number
- Document type/category
- Document description or subject
- Issuing organization
- Department or organizational unit
- Signer's full name
- Signer's official title/position
- Employee ID or other official identifier, when applicable
- Document date
- Issuance/signing timestamp
- Optional additional metadata

The application must validate required fields and prevent accidental duplicate issuance.

### Step 3 — Generate QR and Signature Block

When the admin confirms issuance, the system must:

1. Create a unique, non-guessable verification identifier.
2. Persist the issuance record in the database.
3. Generate a QR code containing the canonical public verification URL.
4. Place the organization logo in the QR center with sufficient error correction and a clean logo background.
5. Generate a high-resolution PNG signature block suitable for insertion into printed or digital documents.
6. Display a preview and a link to the public verification page.
7. Save the generated asset and associate it with the issuance record.
8. Record the issuance event in the audit log.

The QR must not contain confidential document data directly. The verification page must retrieve data from the server.

Do not mark an issuance as successfully completed if database persistence or QR generation fails.

### Step 4 — Download and Use

The admin can:

- Preview the signature block
- Download the PNG
- Print the signature block
- Copy the verification URL
- Open the public verification page
- Re-download the original generated asset

PNG output must have clean edges, readable typography, suitable contrast, configurable dimensions, and a transparent or white background option when technically appropriate.

Provide a layout that remains legible when printed at normal document scale.

### Step 5 — Scan and Verify

Anyone scanning the QR can open the public verification page without creating an account.

Display:

- Organization logo and name
- Verification status
- Document title and number
- Document type
- Document date
- Issuance/signing timestamp
- Signer's full name
- Signer's position/title
- Department or organizational unit
- Issuing organization
- Unique verification reference
- Any other metadata explicitly approved for public disclosure

Use a mobile-first, accessible, professional institutional design.

Do not expose private internal notes, admin account details, secrets, or confidential metadata.

## 3. Verification Status and Truthful Claims

Implement an explicit issuance state machine.

Minimum states:

- DRAFT: record exists but has not been officially issued
- ISSUED: issuance record has been issued and is currently recognized by the system
- REVOKED: issuance has been revoked by an authorized administrator
- EXPIRED: issuance validity has ended, if expiry is enabled

The public page must clearly distinguish these states.

An ISSUED status means that the issuance record exists and is recognized by this application. It does not, by itself, prove that a document file has not been modified or that a legally certified electronic signature has been applied.

Do not display misleading claims such as “cryptographically verified,” “certified electronic signature,” or “legally valid” unless the corresponding verification or certification is genuinely implemented and supported.

If file integrity has not been checked, explicitly state that the QR verifies the issuance record, not the integrity of the entire document file.

## 4. Document Archive

Create a centralized issuance archive.

Required features:

- Paginated document list
- Search by document number, title, signer, and verification reference
- Filters by date, department, organization, and status
- Sort by newest issuance, oldest issuance, title, and document number
- Document detail page for authorized administrators
- QR and PNG download
- Public verification URL
- Issuance timestamp and issuing administrator
- Revocation with mandatory reason
- Historical status and audit timeline
- Clear empty, loading, success, and error states

Issued records must not be silently overwritten or deleted.

If corrections are required after issuance, use a controlled amendment or reissuance process that preserves the original history.

## 5. Logo and QR Requirements

The admin must be able to configure an organization logo.

Requirements:

- Validate uploaded logo file type and size.
- Normalize the logo for consistent rendering.
- Maintain adequate contrast and a clear margin around the logo.
- Use appropriate QR error correction for a centered logo.
- Test generated QR codes using automated decoding where feasible.
- Provide a fallback QR without a centered logo if the logo version fails decoding.
- Never assume visual correctness means the QR is scannable.
- Use a canonical verification URL and a stable reference identifier.
- Do not expose database IDs, secrets, or predictable sequential identifiers in public URLs.

## 6. Security and Audit

Implement:

- Secure admin authentication
- Role-based authorization, with a simple admin role in the MVP
- Server-side input validation
- Output encoding and protection against common web vulnerabilities
- Rate limiting on public verification endpoints
- Secure handling of logo uploads
- Audit logging for issuance, revocation, metadata changes, and administrative actions
- Environment-based configuration and secret management
- Database migrations and backups documented for deployment

Audit events should include the actor, action, target record, timestamp, and relevant change summary.

Never store private signing keys because this MVP does not implement cryptographic signing.

## 7. UX/UI Quality Requirements

Design an original, polished institutional interface inspired by the clarity and information hierarchy of official document verification systems.

Do not copy another organization's branding or imply that this application is affiliated with a government platform.

Avoid generic AI-generated dashboard patterns, excessive gradients, unnecessary glassmorphism, decorative cards without purpose, oversized headings, meaningless charts, and inconsistent spacing.

Use:

- A clear typographic hierarchy
- Consistent spacing and alignment
- A restrained, professional color palette
- Accessible color contrast
- Responsive layouts
- High-quality form validation
- Clear status indicators
- Useful empty states and error recovery
- Fast access to the primary issuance workflow

The issuance form, PNG preview, archive, and public verification page must share a coherent design system while serving their different user needs.

## 8. Database and Architecture

Use a relational database and migrations.

At minimum, design entities for:

- Users
- Organizations
- Organizational units, if required
- Signers
- Document issuance records
- Generated QR/PNG assets
- Issuance status history
- Audit events

Choose the simplest maintainable architecture compatible with the existing project stack.

Do not introduce microservices, message brokers, blockchain, AI agents, OCR, or distributed infrastructure without a demonstrated MVP requirement.

Store timestamps consistently and display them in the configured organization timezone.

## 9. Explicitly Out of Scope for MVP

Do not implement these features yet:

- PDF upload for document comparison
- PDF hash verification workflow
- Embedding or validating cryptographic signatures inside PDFs
- Certified electronic signature provider integration
- Certificate authority integration
- Private-key management
- Automated OCR or AI document extraction
- Blockchain-based notarization
- Complex approval workflows
- Multi-tenant billing or SaaS subscription management

However, do not design the database or application in a way that prevents these features from being added later.

## 10. Testing and Acceptance Criteria

The MVP is not complete until the following are demonstrated:

1. An authorized admin can create an issuance record.
2. Issuing a record automatically generates its unique verification URL, QR, and PNG.
3. The organization logo appears centered in the QR and the QR remains scannable.
4. The generated PNG is readable and suitable for printing.
5. Scanning the QR opens the correct public verification page.
6. The public page displays the correct document and signer details.
7. Draft, issued, revoked, and expired states are handled correctly.
8. Revoked records remain accessible with a clear revoked status.
9. Every issuance appears in the archive and can be searched and filtered.
10. Issued records cannot be silently modified or deleted.
11. Critical actions are written to the audit log.
12. Unauthorized users cannot access admin functions.
13. Public pages do not expose private administrative data.
14. Automated tests cover issuance, QR generation, verification, revocation, authorization, and archive search.
15. Setup, environment configuration, migrations, testing, and deployment are documented.

## 11. Agent Execution Rules

Before coding:

1. Inspect the existing repository and identify its stack, conventions, and current implementation.
2. Research relevant technical requirements when necessary.
3. Write or update PRD.md, ARCHITECTURE.md, DATABASE_SCHEMA.md, API_SPEC.md, DESIGN_SYSTEM.md, SECURITY.md, and IMPLEMENTATION_PLAN.md.
4. Identify risks, assumptions, and unresolved legal or operational requirements.
5. Break implementation into testable milestones.

During implementation:

- Follow the existing project's conventions where sound.
- Prefer complete, maintainable solutions over quick patches.
- Implement database migrations and tests alongside features.
- Do not fabricate successful test results.
- Do not claim that QR issuance establishes legal validity.
- Keep documentation synchronized with actual behavior.

Definition of done: a working, tested MVP that can issue QR signature blocks, serve truthful public verification pages, and maintain a reliable searchable archive of issuance records.