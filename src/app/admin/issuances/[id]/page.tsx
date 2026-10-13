import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { issuanceWithRelationsInclude } from '@/types/issuance'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { IssuanceActions } from './IssuanceActions'
import { AuditTimeline } from './AuditTimeline'
import type { DocumentStatus, AssetType } from '@/generated/prisma/enums'

// Always render fresh from DB — issuance state changes frequently
export const instant = false

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const issuance = await db.documentIssuance.findUnique({
    where: { id },
    select: { title: true, ref: true },
  })
  if (!issuance) return { title: 'Not Found' }
  return { title: `${issuance.title} — WSS QR Signature` }
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-[#e5e7eb] last:border-0">
      <dt className="text-[12px] font-medium text-[#6b7280] uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-[14px] text-[#111827]">{value ?? '—'}</dd>
    </div>
  )
}

export default async function IssuanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const issuance = await db.documentIssuance.findUnique({
    where: { id },
    include: issuanceWithRelationsInclude,
  })

  if (!issuance) notFound()

  const baseUrl = process.env.BASE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const signatureBlockAsset = issuance.assets.find((a) => a.type === 'SIGNATURE_BLOCK')
  const qrAsset = issuance.assets.find((a) => a.type === 'QR_PNG')

  const fmt = (d: Date | string | null | undefined) =>
    d
      ? new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date(d))
      : null

  const fmtDateTime = (d: Date | string | null | undefined) =>
    d
      ? new Intl.DateTimeFormat('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(new Date(d))
      : null

  return (
    <>
      <PageHeader
        title={issuance.title}
        subtitle={`Ref: ${issuance.ref}`}
        action={<Badge status={issuance.status as DocumentStatus} />}
      />

      {/* Status-based actions */}
      <div className="mb-5">
        <IssuanceActions
          issuanceId={issuance.id}
          issuanceRef={issuance.ref}
          status={issuance.status as DocumentStatus}
          assets={issuance.assets.map((a) => ({
            id: a.id,
            type: a.type as AssetType,
            mimeType: a.mimeType,
          }))}
          baseUrl={baseUrl}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main details */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Card title="Document Details">
            <dl>
              <FieldRow label="Title" value={issuance.title} />
              <FieldRow label="Document Number" value={
                <span className="font-mono text-[13px]">{issuance.docNumber}</span>
              } />
              <FieldRow label="Document Type" value={issuance.docType} />
              <FieldRow label="Document Date" value={fmt(issuance.docDate)} />
              <FieldRow label="Issuance Timestamp" value={fmtDateTime(issuance.issuanceTimestamp)} />
              {issuance.expiresAt && (
                <FieldRow label="Expires At" value={fmtDateTime(issuance.expiresAt)} />
              )}
              {issuance.description && (
                <FieldRow label="Description" value={
                  <span className="whitespace-pre-wrap text-[13px]">{issuance.description}</span>
                } />
              )}
            </dl>
          </Card>

          <Card title="Organization">
            <dl>
              <FieldRow label="Organization" value={issuance.org.name} />
              {issuance.unit && (
                <FieldRow
                  label="Organizational Unit"
                  value={
                    issuance.unit.code
                      ? `${issuance.unit.name} (${issuance.unit.code})`
                      : issuance.unit.name
                  }
                />
              )}
              <FieldRow
                label="Signer"
                value={`${issuance.signer.fullName} — ${issuance.signer.title}`}
              />
            </dl>
          </Card>

          {/* Status history */}
          {issuance.statusHistory.length > 0 && (
            <Card title="Status History">
              <ol className="flex flex-col gap-2">
                {issuance.statusHistory.map((h) => (
                  <li key={h.id} className="flex items-start gap-2 text-[13px]">
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge status={h.fromStatus as DocumentStatus} />
                      <span className="text-[#9ca3af]">→</span>
                      <Badge status={h.toStatus as DocumentStatus} />
                    </div>
                    <div className="flex flex-col">
                      <time className="text-[12px] text-[#6b7280]" dateTime={h.createdAt.toISOString()}>
                        {fmtDateTime(h.createdAt)}
                      </time>
                      {h.reason && (
                        <span className="text-[12px] text-[#6b7280]">
                          Reason: {h.reason}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          {/* QR / Signature block preview */}
          {(issuance.status === 'ISSUED' || issuance.status === 'REVOKED') &&
            signatureBlockAsset && (
              <Card title="Signature Block">
                <img
                  src={`/api/issuances/${issuance.id}/assets/${signatureBlockAsset.id}`}
                  alt={`Signature block for ${issuance.title}`}
                  className="w-full h-auto border border-[#e5e7eb] rounded"
                  loading="lazy"
                />
                {qrAsset && (
                  <div className="mt-3 flex justify-center">
                    <img
                      src={`/api/issuances/${issuance.id}/assets/${qrAsset.id}`}
                      alt={`QR code for ${issuance.title}`}
                      className="w-32 h-32 border border-[#e5e7eb] rounded"
                      loading="lazy"
                    />
                  </div>
                )}
              </Card>
            )}

          {/* Admin notes (internal) */}
          {issuance.adminNotes && (
            <Card title="Internal Notes">
              <p className="text-[13px] text-[#6b7280] whitespace-pre-wrap">
                {issuance.adminNotes}
              </p>
              <p className="mt-2 text-[11px] text-[#9ca3af]">
                Not visible on the public verification page.
              </p>
            </Card>
          )}

          {/* Audit timeline */}
          <Card title="Audit Log">
            <Suspense
              fallback={
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 bg-[#f3f4f6] rounded" />
                  ))}
                </div>
              }
            >
              <AuditTimeline issuanceId={issuance.id} />
            </Suspense>
          </Card>

          {/* Metadata */}
          <Card title="Record Info">
            <dl>
              <FieldRow label="Created By" value={issuance.createdBy.name} />
              <FieldRow label="Created At" value={fmtDateTime(issuance.createdAt)} />
              <FieldRow label="Last Updated" value={fmtDateTime(issuance.updatedAt)} />
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
