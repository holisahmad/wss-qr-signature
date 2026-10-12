# Design Decisions — WSS QR Signature

## 1. Project Context

- **Project name:** WSS QR Signature
- **Product type:** Institutional document issuance and QR verification system
- **Primary users:** Organizational administrators (desktop, office context); public verifiers (mobile, field context)
- **Primary user goals:**
  - Administrators: efficiently create issuance records, generate verifiable QR + PNG, manage archive
  - Verifiers: quickly confirm document authenticity by scanning QR
- **Main workflows:** Sign in → Create record → Issue (generate QR + PNG) → Download → Public verification
- **Target devices and viewports:** Admin — desktop (1024px+); Public verification — mobile-first (320–768px)
- **Information density:** High (admin archive, detail pages, audit timeline); Medium (public verification)
- **Risk level:** High — incorrect status display or exposed private data has real-world consequences
- **Relevant technical constraints:** Next.js 15 App Router, TypeScript strict, Prisma, Tailwind CSS v4, `@napi-rs/canvas` for PNG generation

---

## 2. Selected Design Direction

**Direction:** Enterprise Information System

**Product-specific rationale:**  
WSS QR Signature serves institutional administrators who need to issue official documents with confidence. The visual language must communicate authority, precision, and trustworthiness. It is not a consumer SaaS product; it is an operational tool used in a professional context where errors have real consequences.

**Why this direction fits the users:**  
Administrators are professionals accustomed to institutional software (government portals, HR systems, document management tools). They expect clear information hierarchy, dense but readable tables, and unambiguous status indicators. The public verification page is seen by document recipients — often in formal contexts — who need instant confidence that the document is legitimate.

**Alternatives considered:**

1. **SaaS Dashboard (rejected):** Common AI-generated style with rounded cards, large gradient hero, stats prominently displayed. Rejected because it looks generic and prioritizes visual appeal over operational clarity. This product is not a SaaS marketing page.

2. **Material Design (rejected):** Google's Material Design 3 system is designed for consumer mobile applications. The elevated-card pattern and bright accent colors feel informal and consumer-oriented, which conflicts with the institutional authority this product must project.

3. **Minimalist/Editorial (rejected):** Pure typography-led design with very large text and generous whitespace. Rejected because the admin interface requires high information density — tables, filters, audit timelines — which does not suit an editorial layout.

---

## 3. Reference Research

No external resources were accessed via browser during this session.

Design direction was derived from:
- Product requirements in `roadmaps-wss-qr-signature.md`: "institutional," "official," "authoritative"
- Established enterprise SaaS patterns for document management and government verification portals
- UI Design Intelligence Pack guidance: Enterprise Information System direction for data-heavy administrative tools
- Design principle: deep navy (`#1e3a5f`) signals trust and authority; white backgrounds communicate clarity; restrained palette avoids distraction

---

## 4. Information Architecture

- **Primary navigation:** Admin sidebar with: Dashboard, Issuances (archive), New Issuance, Settings
- **Primary page:** `/admin/issuances/new` — the issuance creation form (primary workflow)
- **Primary action:** "Issue" (triggers QR + PNG generation)
- **Secondary actions:** Download PNG, Copy URL, Revoke, Edit
- **Important data and hierarchy:**
  1. Document status (most important — determines all available actions)
  2. Document title + number
  3. Signer identity
  4. Organization + unit
  5. Dates (issuance, document date)
  6. Generated assets (QR preview, download)
  7. Audit history (least prominent)
- **Loading, empty, error, and success states:** All defined in Design System (DESIGN_SYSTEM.md)
- **Permissions:** `/admin/*` routes require authentication; public verification is unauthenticated but rate-limited
- **Destructive actions:** Revocation requires confirmation dialog with mandatory reason field

---

## 5. Visual Direction

- **Brand personality:** Authoritative, precise, institutional. Think official documents, not startup dashboards.
- **Color strategy:** Single primary color (`#1e3a5f` deep navy) for nav, primary buttons, and identity. Semantic colors only for status indicators. No gradients, no decorative colors.
- **Typography strategy:** Inter (geometric sans-serif) — legible, neutral, professional. Tabular numerals for data columns.
- **Spacing strategy:** Compact-but-breathable. 16px (p-4) as base unit. 24px between sections. 8px within components.
- **Surface strategy:** White surface on light-gray background (`#f8f9fa`). No layered shadows. Subtle borders for separation.
- **Iconography:** lucide-react — consistent stroke weight, appears at 16–20px paired with text labels.
- **Motion policy:** Minimal. Transitions 150ms for state changes. Reduced-motion respect mandatory.

---

## 6. Component Strategy

- **Existing components to reuse:** None (greenfield project)
- **Components to build:** Button, Input, Select, Badge, DataTable, PageHeader, Card, Dialog, Toast, AdminLayout (see DESIGN_SYSTEM.md §7)
- **New components justified by pattern:** StatusBadge (status-specific variant of Badge with both color and text/icon); AuditTimeline (reads-once list); IssuanceStatusHistory (vertical timeline)
- **Dependencies proposed:**
  - `lucide-react` — MIT, free, tree-shakable icon set (already installed)
  - `tailwindcss` — MIT, free (already installed)
  - No additional UI libraries (no Radix UI, no Shadcn — keep bundle lean for MVP)
- **Free/licensing/cost verification:** All dependencies are MIT or Apache-2.0; no paid services.

---

## 7. Responsive and Accessibility Plan

- **Mobile behavior:** Admin nav collapses to hamburger; tables scroll horizontally; forms single-column; dialogs full-screen. Public verification: single-column, status badge top-of-page.
- **Tablet behavior:** Admin nav visible at `lg`+; below that, overlay drawer.
- **Desktop behavior:** Fixed 240px sidebar + fluid content. Two-column forms on wide screens.
- **Keyboard and focus behavior:** All interactive elements keyboard-reachable. Focus ring: `outline-2 outline-offset-2` in accent blue. Tab order follows DOM order.
- **Contrast and semantic status indicators:** All text/background combinations meet WCAG AA. Status NEVER conveyed by color alone — always accompanied by text label (e.g., "✓ Issued", "✗ Revoked").
- **Screen reader considerations:** Semantic HTML (`<main>`, `<nav>`, `<table>` with proper headers, `<form>` with `<label>`). `aria-live` for toast notifications. `aria-labelledby` for dialogs. Status badge uses `role="status"` or visible text.
- **Reduced motion:** CSS `@media (prefers-reduced-motion: reduce)` removes all transitions and animations.

---

## 8. Validation Plan

- [x] Build (`npm run build`)
- [x] Type checking (`npm run typecheck`)
- [x] Lint (`npm run lint`)
- [ ] Unit/integration tests (FEAT-005)
- [ ] End-to-end tests (out of scope for MVP)
- [ ] Responsive layout checks (FEAT-003+)
- [ ] Accessibility checks (FEAT-003+)
- [ ] Browser console/network checks (FEAT-003+)
- [ ] Visual review (FEAT-003+)

---

## 9. Decisions and Trade-offs

| Date | Decision | Reason | Trade-off | Status |
|---|---|---|---|---|
| 2024-10 | SQLite for dev, PostgreSQL-compatible schema | Zero infrastructure for local dev | Must use compatible types; tested separately in prod | Decided |
| 2024-10 | In-memory rate limiter for MVP | No Redis required; simpler setup | Resets on restart; not distributed | Decided |
| 2024-10 | `@napi-rs/canvas` over `node-canvas` | Better binary compatibility on macOS arm64 | Less documented; identical API | Decided |
| 2024-10 | No Radix UI / Shadcn | Reduce dependencies; custom components match institutional style better | More implementation effort | Decided |
| 2024-10 | nanoid(21) for public refs | Non-guessable, URL-safe, compact | Cannot be reversed to DB ID (intentional) | Decided |
| 2024-10 | Append-only AuditEvent | Regulatory and trust requirement | Disk growth over time; plan archival strategy | Decided |

---

## 10. Unresolved Questions and Limitations

- QR scannability validation: need to verify that `qrcode` output with logo overlay can be decoded by consumer scanners. Automated fallback (no-logo) must be tested.
- `@napi-rs/canvas` binary: confirmed available for macOS; Linux/arm64 production deployment must be validated.
- Multi-organization support: current schema supports multiple orgs, but admin user is not scoped to an org in MVP. All admins see all orgs.
- Expiry automation: `EXPIRED` status is not automatically applied in MVP. Manual trigger or scheduled job needed.
- PostgreSQL production migration: migrations tested on SQLite dev; must run `npx prisma migrate deploy` on PostgreSQL before first production launch.
