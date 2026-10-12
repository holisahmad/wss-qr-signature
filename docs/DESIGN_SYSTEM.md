# Design System — WSS QR Signature

## 1. Design Principles

1. **Product-specific:** every visual decision serves the institutional document issuance context.
2. **Clear hierarchy:** the most important information (status, document title, signer) is immediately visible.
3. **Purposeful restraint:** no glassmorphism, no gradients, no decorative blobs. Each element earns its place.
4. **Consistency:** tokens and components are reused across all pages.
5. **Accessibility:** WCAG 2.2 AA target; status is never conveyed by color alone.
6. **Honest states:** loading, empty, error, and success states all exist and are accurate.
7. **Free-first:** Tailwind CSS, lucide-react, and Next.js built-ins — no paid assets.

---

## 2. Product Context

- **Product:** WSS QR Signature — QR-based document issuance and verification
- **Users:** Institutional administrators (desktop-primary), public verifiers (mobile-primary)
- **Primary tasks:** Create issuance records, generate QR + PNG, archive management, public verification
- **Brand personality:** Authoritative, precise, institutional. Deep navy signals trust and official purpose.
- **Information density:** High (archive tables, audit timelines, issuance forms)
- **Target devices:** Admin — desktop; Public verification — mobile-first

---

## 3. Color Tokens

Defined as CSS custom properties in `src/app/globals.css`.

| Token | Value | Intended use |
|---|---|---|
| `--color-brand` | `#1e3a5f` | Primary brand (nav, headers, primary buttons) |
| `--color-brand-hover` | `#2d5a8e` | Brand hover state |
| `--color-accent` | `#2563eb` | Interactive links and secondary accents |
| `--color-background` | `#f8f9fa` | Main page background |
| `--color-surface` | `#ffffff` | Cards, panels, form controls |
| `--color-text-primary` | `#111827` | Main readable text |
| `--color-text-secondary` | `#6b7280` | Supporting labels, metadata |
| `--color-border` | `#e5e7eb` | Subtle boundaries and separators |
| `--color-success` | `#15803d` | ISSUED status — used with text label |
| `--color-success-bg` | `#dcfce7` | ISSUED badge background |
| `--color-warning` | `#b45309` | EXPIRED — used with text label |
| `--color-warning-bg` | `#fef3c7` | EXPIRED badge background |
| `--color-danger` | `#dc2626` | REVOKED + destructive actions — with text label |
| `--color-danger-bg` | `#fee2e2` | REVOKED badge background |
| `--color-info` | `#1d4ed8` | Informational elements |
| `--color-muted` | `#9ca3af` | DRAFT status, disabled states |
| `--color-muted-bg` | `#f3f4f6` | DRAFT badge background |

**Contrast policy:** All text on colored backgrounds meets WCAG AA (4.5:1 minimum for normal text, 3:1 for large text). Status is always communicated with both color and a text label or icon.

---

## 4. Typography

- **Primary font:** Inter (system stack)
- **Fallback stack:** `'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', sans-serif`
- **Source:** Google Fonts Inter via `next/font/google` (performance-safe, GDPR note: self-hosted alternative available)

### Type scale

| Use | Class | Size | Weight | Line height |
|---|---|---|---|---|
| Page title | `text-2xl font-bold` | 24px | 700 | 1.25 |
| Section heading | `text-lg font-semibold` | 18px | 600 | 1.375 |
| Card heading | `text-base font-semibold` | 16px | 600 | 1.5 |
| Body | `text-sm` | 14px | 400 | 1.5 |
| Supporting/label | `text-xs` | 12px | 400 | 1.5 |
| Table data | `text-sm tabular-nums` | 14px | 400 | 1.5 |

- Tabular numerals (`font-variant-numeric: tabular-nums`) on all numeric columns.
- Document reference codes use monospace: `font-mono`.

---

## 5. Spacing and Layout

- **Spacing scale:** Tailwind default (4px base) — multiples of 4.
- **Common spacings:** `gap-2` (8px), `gap-4` (16px), `gap-6` (24px), `p-4` (16px), `p-6` (24px).
- **Content max-width:** `max-w-7xl` (1280px) for admin pages; `max-w-2xl` (672px) for verification page.
- **Page gutters:** `px-4 sm:px-6 lg:px-8`.
- **Admin layout:** Fixed sidebar 240px + fluid content area.
- **Responsive breakpoints:** `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- **Dense tables:** `py-2` row height (32px minimum touch target in mobile view).

---

## 6. Surfaces and Shape

- **Border radius:** `rounded` (4px) for inputs; `rounded-md` (6px) for cards and panels; `rounded-full` for badges.
- **Border policy:** `border border-[--color-border]` for cards, inputs. No border on flat backgrounds.
- **Shadow/elevation:** Minimal. `shadow-sm` for cards. No decorative shadows.
- **Card usage:** Only when visual grouping genuinely improves comprehension (e.g., issuance detail sections). Not used as a decorative default.
- **Modal/dialog:** White, centered, `max-w-md`, backdrop `bg-black/40`, focus-trapped, Escape closes.

---

## 7. Components

| Component | Purpose | Key variants |
|---|---|---|
| `Button` | Actions | primary (brand), secondary (outline), danger, ghost; sm/md/lg; loading |
| `Input` | Text entry | label, helper, error message; controlled |
| `Select` | Dropdown choice | label, error; native `<select>` for accessibility |
| `Badge` | Status display | ISSUED (green), REVOKED (red), EXPIRED (amber), DRAFT (gray), with text + color |
| `DataTable` | Tabular data | sortable headers, pagination, loading skeleton, empty state |
| `PageHeader` | Page top area | title + subtitle + action slot |
| `Card` | Grouped content | Only when grouping adds meaning |
| `Dialog` | Modal overlay | Focus trap, Escape closes, `aria-labelledby` |
| `Toast` | Notifications | success/error/info; auto-dismiss |
| `AdminLayout` | Admin shell | Fixed sidebar nav, main content area |

All icon buttons include `aria-label`. Decorative icons use `aria-hidden="true"` with adjacent visible label.

---

## 8. Interaction States

| State | Visual treatment |
|---|---|
| Default | Baseline styles |
| Hover | Subtle background shift; `transition-colors duration-150` |
| Focus-visible | `outline-2 outline-offset-2 outline-[--color-accent]` |
| Active/pressed | Slightly darker background |
| Disabled | `opacity-50 cursor-not-allowed` |
| Loading | Spinner replaces icon in button; skeleton rows in table |
| Success | Toast notification + page update |
| Validation error | Red border + error text below input field |
| Empty result | Centered empty state with clear next-action link |
| Network error | Inline error message with retry option |

---

## 9. Motion

- **Policy:** Motion communicates state change (loading → loaded, appearing modal, disappearing toast).
- Transitions short: 150ms for color/opacity, 200ms for position.
- All transitions use `prefers-reduced-motion` override: `@media (prefers-reduced-motion: reduce) { * { transition: none; } }`.
- No decorative animations. No animated backgrounds or floating shapes.

---

## 10. Icons and Imagery

- **Icon library:** `lucide-react` — consistent stroke-weight, tree-shakable.
- **Usage:** Icons are always paired with visible text labels on primary actions. Icon-only buttons have `aria-label`.
- **Org logos:** Uploaded by admin. Normalized to ≤ 300×300 px, displayed as `<img>` with meaningful `alt`.
- **Generated PNG:** Displayed as `<img alt="Signature block for {title}">` in preview.
- **No stock illustrations.** No generic hero images.

---

## 11. Responsive Rules

- **Admin navigation:** Sidebar fixed on `lg+`; hamburger menu + drawer on `md-`.
- **Archive table:** Horizontal scroll on mobile with `min-width` on columns. Action column sticky right.
- **Forms:** Single-column on mobile, two-column grid on `lg+` for issuance form.
- **Dialogs:** Full-screen on mobile (`sm:max-w-md`).
- **Touch targets:** Minimum 44×44px for all interactive elements.
- **Public verification page:** Single column, mobile-first. Status badge always visible above the fold.

---

## 12. Quality Gate

- [x] Design is appropriate for institutional document issuance
- [x] No unnecessary decorative elements
- [x] Shared tokens and components used consistently
- [x] Controls have meaningful behavior (described in ARCHITECTURE.md)
- [x] Loading, empty, error, and success states defined
- [x] Target viewport sizes specified
- [x] Accessibility requirements defined
- [x] No unapproved paid dependency
- [ ] Build and tests confirmed after implementation (FEAT-002+)
