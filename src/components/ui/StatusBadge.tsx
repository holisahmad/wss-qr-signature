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
      'bg-[--color-success-bg] border-2 border-[--color-success]',
    textClass: 'text-[--color-success]',
    Icon: CheckCircle2,
  },
  REVOKED: {
    label: '✗ Revoked',
    subtext: 'This issuance record has been revoked.',
    containerClass: 'bg-[--color-danger-bg] border-2 border-[--color-danger]',
    textClass: 'text-[--color-danger]',
    Icon: XCircle,
  },
  EXPIRED: {
    label: '⚠ Expired',
    subtext: 'This issuance record has expired.',
    containerClass:
      'bg-[--color-warning-bg] border-2 border-[--color-warning]',
    textClass: 'text-[--color-warning]',
    Icon: AlertTriangle,
  },
  DRAFT: {
    label: 'Not Issued',
    subtext: 'This record has not been officially issued.',
    containerClass: 'bg-[--color-muted-bg] border-2 border-[--color-border]',
    textClass: 'text-[--color-text-secondary]',
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
