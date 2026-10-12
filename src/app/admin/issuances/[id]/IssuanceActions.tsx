'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import type { DocumentStatus, AssetType } from '@/generated/prisma/enums'

interface Asset {
  id: string
  type: AssetType
  mimeType: string
}

interface IssuanceActionsProps {
  issuanceId: string
  issuanceRef: string
  status: DocumentStatus
  assets: Asset[]
  baseUrl: string
}

export function IssuanceActions({
  issuanceId,
  issuanceRef,
  status,
  assets,
  baseUrl,
}: IssuanceActionsProps) {
  const router = useRouter()
  const { showToast, ToastContainer } = useToast()

  const [issuing, setIssuing] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokeError, setRevokeError] = useState('')
  const [revoking, setRevoking] = useState(false)

  const verifyUrl = `${baseUrl}/verify/${issuanceRef}`
  const signatureBlockAsset = assets.find((a) => a.type === 'SIGNATURE_BLOCK')

  async function handleIssue() {
    setIssuing(true)
    try {
      const res = await fetch(`/api/issuances/${issuanceId}/issue`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to issue document.', 'error')
      } else {
        showToast('Document issued successfully. QR code generated.', 'success')
        router.refresh()
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIssuing(false)
    }
  }

  async function handleRevoke() {
    if (!revokeReason.trim() || revokeReason.trim().length < 10) {
      setRevokeError('Reason must be at least 10 characters.')
      return
    }
    setRevoking(true)
    setRevokeError('')
    try {
      const res = await fetch(`/api/issuances/${issuanceId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRevokeError(json.error?.message ?? 'Failed to revoke.')
      } else {
        setRevokeOpen(false)
        showToast('Issuance revoked.', 'success')
        router.refresh()
      }
    } catch {
      setRevokeError('Network error. Please try again.')
    } finally {
      setRevoking(false)
    }
  }

  async function copyVerifyUrl() {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      showToast('Verification URL copied to clipboard.', 'success')
    } catch {
      showToast('Failed to copy URL.', 'error')
    }
  }

  return (
    <>
      <ToastContainer />

      <div className="flex flex-wrap items-center gap-2">
        {status === 'DRAFT' && (
          <>
            <Button variant="primary" size="sm" loading={issuing} onClick={handleIssue}>
              Issue Document
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/admin/issuances/${issuanceId}/edit`)}
            >
              Edit
            </Button>
          </>
        )}

        {status === 'ISSUED' && (
          <>
            {signatureBlockAsset && (
              <a
                href={`/api/issuances/${issuanceId}/assets/${signatureBlockAsset.id}`}
                download="signature-block.png"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[--color-border] bg-[--color-surface] text-[13px] text-[--color-text-primary] hover:bg-[--color-background] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
              >
                Download PNG
              </a>
            )}
            <Button variant="secondary" size="sm" onClick={copyVerifyUrl}>
              Copy Verification URL
            </Button>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[--color-border] bg-[--color-surface] text-[13px] text-[--color-text-primary] hover:bg-[--color-background] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
            >
              View Public Page ↗
            </a>
            <Button variant="danger" size="sm" onClick={() => setRevokeOpen(true)}>
              Revoke
            </Button>
          </>
        )}

        {status === 'REVOKED' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/admin/issuances/new')}
          >
            New Issuance from this Record
          </Button>
        )}
      </div>

      {/* Revoke confirmation dialog */}
      <Dialog isOpen={revokeOpen} onClose={() => setRevokeOpen(false)} title="Revoke Issuance">
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[--color-text-primary]">
            Revoking this issuance will mark it as revoked and it will no longer verify as valid.
            The document and its QR code remain in the system but will show as revoked.
          </p>
          <p className="text-[13px] text-[--color-text-secondary]">
            Issuance ref: <span className="font-mono text-[--color-text-primary]">{issuanceRef}</span>
          </p>
          <Textarea
            label="Reason for revocation"
            required
            value={revokeReason}
            onChange={(e) => { setRevokeReason(e.target.value); setRevokeError('') }}
            error={revokeError}
            placeholder="Provide a clear reason (minimum 10 characters)..."
            rows={3}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokeOpen(false)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={revoking} onClick={handleRevoke}>
              Confirm Revoke
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
