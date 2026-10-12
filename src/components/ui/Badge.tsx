import type { DocumentStatus } from '@/generated/prisma/enums'

interface BadgeProps {
  status: DocumentStatus
  className?: string
}

const statusConfig: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  ISSUED: {
    label: '✓ Issued',
    className:
      'bg-[--color-success-bg] text-[--color-success] border border-[--color-success]',
  },
  REVOKED: {
    label: '✗ Revoked',
    className:
      'bg-[--color-danger-bg] text-[--color-danger] border border-[--color-danger]',
  },
  EXPIRED: {
    label: '⚠ Expired',
    className:
      'bg-[--color-warning-bg] text-[--color-warning] border border-[--color-warning]',
  },
  DRAFT: {
    label: '○ Draft',
    className: 'bg-[--color-muted-bg] text-[--color-text-secondary] border border-[--color-border]',
  },
}

export function Badge({ status, className = '' }: BadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium whitespace-nowrap',
        config.className,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Status: ${status}`}
    >
      {config.label}
    </span>
  )
}
