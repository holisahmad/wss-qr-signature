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
      'bg-[#dcfce7] text-[#15803d] border border-[#15803d]',
  },
  REVOKED: {
    label: '✗ Revoked',
    className:
      'bg-[#fee2e2] text-[#dc2626] border border-[#dc2626]',
  },
  EXPIRED: {
    label: '⚠ Expired',
    className:
      'bg-[#fef3c7] text-[#b45309] border border-[#b45309]',
  },
  DRAFT: {
    label: '○ Draft',
    className: 'bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]',
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
