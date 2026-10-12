# Security — WSS QR Signature

## 1. Authentication

- **Method:** Email + password via NextAuth.js v5 credentials provider.
- **Password storage:** bcrypt hash (cost factor ≥ 12) via `bcryptjs`. Plaintext passwords are never stored or logged.
- **Session:** JWT strategy via NextAuth.js. Session cookies are `HttpOnly`, `Secure` (in production), `SameSite=Lax`.
- **NEXTAUTH_SECRET:** Required in production. Must be a cryptographically random string ≥ 32 bytes. Generate with `openssl rand -base64 32`.

### Session lifecycle
- Session tokens expire per NextAuth.js defaults.
- On `signOut()`, the session is cleared client-side; JWT is discarded.

---

## 2. Authorization (RBAC)

- **Single role in MVP:** `ADMIN`
- All `/admin/*` routes protected by `src/middleware.ts` which checks for a valid NextAuth.js session.
- All API routes except `/api/verify/*` and `/api/auth/*` require an ADMIN session.
- `requireAdmin(request)` helper in `src/lib/auth-utils.ts` returns 401 (no session) or 403 (wrong role).
- The `role` field is embedded in the JWT and included in `session.user.role`.

---

## 3. Input Validation

- All API request bodies validated with Zod schemas at the API route level before any database access.
- Validation failure returns 422 with structured error details.
- String fields sanitized via Zod `.trim()` to prevent leading/trailing whitespace issues.
- Date fields parsed and validated as valid ISO 8601 before database write.
- No raw SQL queries — all database access via Prisma parameterized queries.

---

## 4. File Upload Security

Logo uploads at `POST /api/organizations/:id/logo`:

- **MIME type whitelist:** `image/png`, `image/jpeg`, `image/svg+xml` only. Verified server-side via the Content-Type of the multipart part and optionally magic-byte check.
- **Size limit:** 2 MB enforced server-side. Reject before processing.
- **Normalization:** All uploads processed through `sharp` to normalize dimensions (≤ 300×300 px). SVG files are rasterized. This mitigates SVG XSS risks.
- **Storage:** Files stored in `UPLOAD_DIR`, not in the web root. Served via authenticated API routes.
- **Filenames:** Generated from a safe ID, never from user-supplied filenames.

---

## 5. Public Endpoint Security

### Data exposure policy for /api/verify/:ref
Never returns:
- `adminNotes`
- `createdById` or any user email/ID
- Internal database IDs
- IP addresses
- Status history detail beyond the current status

Returns only: ref, status, title, docNumber, docType, docDate, issuanceTimestamp, expiresAt, org name, unit name, signer name and title.

### Rate limiting
- `/api/verify/*`: 30 requests per minute per IP (in-memory sliding window).
- Responds 429 with `Retry-After` header when exceeded.
- MVP: in-memory limiter (resets on restart). Production: use Redis-backed limiter.

### QR payload
- The QR code encodes only the public verification URL: `{BASE_URL}/verify/{ref}`.
- No confidential data, no admin credentials, no database IDs in the QR payload.
- The `ref` is a `nanoid(21)` — 21 characters of URL-safe alphabet — not guessable.

---

## 6. Audit Log

- All mutating admin actions write an `AuditEvent` record.
- Audit events are **append-only**: no UPDATE or DELETE operations on `AuditEvent` exist anywhere in the codebase.
- Captured events: `ISSUANCE_CREATED`, `ISSUANCE_UPDATED`, `ISSUANCE_ISSUED`, `ISSUANCE_REVOKED`, `LOGO_UPLOADED`.
- Each event records: actor ID, action type, entity type + ID, metadata summary, IP address, timestamp.
- `writeAuditEvent()` never throws — audit failure should not interrupt the primary operation.

---

## 7. Environment and Secrets

Required environment variables:
| Variable | Sensitivity | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | Critical | Must be ≥ 32 random bytes; never commit |
| `DATABASE_URL` | High | Contains DB credentials in production |
| `NEXTAUTH_URL` | Low | Canonical server URL |
| `BASE_URL` | Low | Used in QR verification URLs |
| `UPLOAD_DIR` | Medium | Filesystem path; ensure correct permissions |

- `.env` is git-ignored; only `.env.example` is committed.
- Secrets must never be hardcoded in source code.
- In production, use a secrets manager (AWS Secrets Manager, Vault, etc.) rather than a `.env` file.

---

## 8. Common Web Vulnerabilities

| Vulnerability | Mitigation |
|---|---|
| SQL injection | Prisma parameterized queries; no raw SQL |
| XSS | Next.js JSX auto-escapes output; no `dangerouslySetInnerHTML` |
| CSRF | NextAuth.js uses CSRF token on credential forms; App Router server actions include CSRF protection |
| Path traversal | File paths generated from safe IDs, not user input |
| Insecure direct object reference | Public URLs use `nanoid(21)` refs, not sequential IDs |
| Brute force login | Consider adding rate limiting on `POST /api/auth/callback/credentials` in production |

---

## 9. Production Checklist

- [ ] `NEXTAUTH_SECRET` is a fresh random value (never the example value)
- [ ] `DATABASE_URL` points to production PostgreSQL with minimal-privilege credentials
- [ ] `UPLOAD_DIR` is outside the web root and not publicly accessible
- [ ] HTTPS enforced (session cookies use `Secure` flag)
- [ ] Session cookies use `SameSite=Lax` minimum; `Strict` if no cross-site embedding needed
- [ ] Rate limiting backed by Redis or similar persistent store
- [ ] Audit log storage capacity planned and monitored
- [ ] Dependency vulnerabilities checked: `npm audit`
- [ ] Content-Security-Policy header configured
