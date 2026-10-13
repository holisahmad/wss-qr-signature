import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import type { DocumentStatus } from '@/generated/prisma/enums'

interface StatusBadgeProps {
  status: DocumentStatus
  className?: string
}

const statusConfig: Record<
  DocumentStatus,
  {
    label: string
    subtext: string
    containerClass: string
    textClass: string
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  }
> = {
  ISSUED: {
    label: '✓ Issued',
    subtext: 'This issuance record is recognized by the issuing organization.',
    containerClass:
      'bg-[#dcfce7] border-2 border-[#15803d]',
    textClass: 'text-[#15803d]',
    Icon: CheckCircle2,
  },
  REVOKED: {
    label: '✗ Revoked',
    subtext: 'This issuance record has been revoked.',
    containerClass: 'bg-[#fee2e2] border-2 border-[#dc2626]',
    textClass: 'text-[#dc2626]',
    Icon: XCircle,
  },
  EXPIRED: {
    label: '⚠ Expired',
    subtext: 'This issuance record has expired.',
    containerClass:
      'bg-[#fef3c7] border-2 border-[#b45309]',
    textClass: 'text-[#b45309]',
    Icon: AlertTriangle,
  },
  DRAFT: {
    label: 'Not Issued',
    subtext: 'This record has not been officially issued.',
    containerClass: 'bg-[#f3f4f6] border-2 border-[#e5e7eb]',
    textClass: 'text-[#6b7280]',
    Icon: Clock,
  },
}

/**
 * Prominent status badge for the public verification page.
 * Works as a server component — no 'use client' needed.
 * Text label always present (never color alone) for accessibility.
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = statusConfig[status]
  const { Icon } = cfg

  return (
    <div
      role="status"
      aria-label={`Document status: ${status}`}
      className={[
        'rounded-lg px-5 py-4 flex items-start gap-3',
        cfg.containerClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon
        className={['mt-0.5 size-6 shrink-0', cfg.textClass].join(' ')}
        aria-hidden={true}
      />
      <div>
        <p className={['text-lg font-semibold leading-tight', cfg.textClass].join(' ')}>
          {cfg.label}
        </p>
        <p className={['mt-1 text-sm', cfg.textClass].join(' ')}>{cfg.subtext}</p>
      </div>
    </div>
  )
}
