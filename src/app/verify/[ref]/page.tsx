import type { Metadata } from 'next'
import Image from 'next/image'
import { getPublicVerification } from '@/lib/services/verification-service'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CopyURLButton } from '@/components/ui/CopyURLButton'

// Opt out of static prerendering — this page is always dynamic (DB lookup per ref)
export const instant = false

type PageProps = {
  params: Promise<{ ref: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ref } = await params
  return {
    title: `Document Verification — ${ref}`,
    description: `Verify issuance record ${ref}`,
    robots: { index: false, follow: false },
  }
}

/** Format a Date to a readable locale string (server-side, consistent). */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Not-found state ─────────────────────────────────────────────────────────

function NotFoundState() {
  return (
    <main className="min-h-screen bg-[--color-background] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-[--color-border] bg-[--color-surface] px-6 py-10 text-center shadow-sm">
        <p className="text-4xl">🔍</p>
        <h1 className="mt-4 text-xl font-semibold text-[--color-text-primary]">
          Verification record not found
        </h1>
        <p className="mt-2 text-sm text-[--color-text-secondary]">
          The reference may be invalid or the record may not exist.
        </p>
      </div>
    </main>
  )
}

// ─── Verification Page ────────────────────────────────────────────────────────

export default async function VerifyPage({ params }: PageProps) {
  const { ref } = await params
  const record = await getPublicVerification(ref)

  if (!record) {
    return <NotFoundState />
  }

  const { document: doc, organization: org, organizationalUnit: unit, signer } = record

  return (
    <main className="min-h-screen bg-[--color-background] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">

        {/* ── Card ── */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] shadow-sm overflow-hidden">

          {/* ── Header: org branding ── */}
          <div className="border-b border-[--color-border] bg-[--color-brand] px-6 py-5">
            <div className="flex items-center gap-4">
              {org.logoPath && (
                <div className="shrink-0">
                  <Image
                    src={org.logoPath}
                    alt={`${org.name} logo`}
                    width={80}
                    height={80}
                    className="max-h-[80px] max-w-[200px] object-contain rounded"
                  />
                </div>
              )}
              <div>
                <p className="font-semibold text-white leading-snug">{org.name}</p>
                <p className="text-sm text-blue-200 mt-0.5">QR Document Verification</p>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-6 space-y-6">

            {/* Status badge — prominent, above the fold on mobile */}
            <StatusBadge status={record.status} />

            {/* Document details grid */}
            <section aria-labelledby="doc-details-heading">
              <h2
                id="doc-details-heading"
                className="text-xs font-semibold uppercase tracking-wider text-[--color-text-secondary] mb-3"
              >
                Document Details
              </h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Full-width: document title */}
                <div className="sm:col-span-2 rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Document Title</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {doc.title}
                  </dd>
                </div>

                <div className="rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Document Number</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {doc.docNumber}
                  </dd>
                </div>

                <div className="rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Document Type</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {doc.docType}
                  </dd>
                </div>

                <div className="rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Document Date</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {formatDate(doc.docDate)}
                  </dd>
                </div>

                <div className="rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Issued At</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {formatDate(doc.issuanceTimestamp)}
                  </dd>
                </div>

                <div className="rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Expires At</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {doc.expiresAt ? formatDate(doc.expiresAt) : 'No expiry'}
                  </dd>
                </div>

                {unit && (
                  <div className="rounded-md bg-[--color-background] px-4 py-3">
                    <dt className="text-xs text-[--color-text-secondary]">Department</dt>
                    <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                      {unit.name}
                    </dd>
                  </div>
                )}

                <div className="rounded-md bg-[--color-background] px-4 py-3">
                  <dt className="text-xs text-[--color-text-secondary]">Organization</dt>
                  <dd className="mt-1 text-sm font-medium text-[--color-text-primary]">
                    {org.name}
                  </dd>
                </div>

              </dl>
            </section>

            {/* Signer */}
            <section aria-labelledby="signer-heading">
              <h2
                id="signer-heading"
                className="text-xs font-semibold uppercase tracking-wider text-[--color-text-secondary] mb-3"
              >
                Signed By
              </h2>
              <div className="rounded-md bg-[--color-background] px-4 py-3">
                <p className="text-sm font-medium text-[--color-text-primary]">
                  {signer.fullName}
                </p>
                <p className="text-sm text-[--color-text-secondary]">{signer.title}</p>
              </div>
            </section>

            {/* Verification reference */}
            <section aria-labelledby="ref-heading">
              <h2
                id="ref-heading"
                className="text-xs font-semibold uppercase tracking-wider text-[--color-text-secondary] mb-2"
              >
                Verification Reference
              </h2>
              <p className="rounded-md bg-[--color-muted-bg] px-4 py-3 font-mono text-xs text-[--color-text-secondary] break-all select-all">
                {record.ref}
              </p>
            </section>

            {/* Disclaimer */}
            <div
              role="note"
              className="flex items-start gap-3 rounded-md border border-[--color-warning] bg-[--color-warning-bg] px-4 py-3"
            >
              <span className="mt-0.5 shrink-0 text-[--color-warning]" aria-hidden="true">
                ⚠
              </span>
              <p className="text-sm text-[--color-warning]">
                This page verifies the issuance record only. It does not verify the integrity or
                authenticity of the document file itself.
              </p>
            </div>

            {/* Copy URL — client island */}
            <div className="flex justify-center">
              <CopyURLButton />
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="border-t border-[--color-border] bg-[--color-background] px-6 py-3 text-center">
            <p className="text-xs text-[--color-text-secondary]">Powered by WSS QR Signature</p>
          </div>

        </div>
      </div>
    </main>
  )
}
