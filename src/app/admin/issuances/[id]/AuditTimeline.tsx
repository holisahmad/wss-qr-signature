import { db } from '@/lib/db'

interface AuditTimelineProps {
  issuanceId: string
}

const ACTION_LABELS: Record<string, string> = {
  ISSUANCE_CREATED: 'Issuance created',
  ISSUANCE_UPDATED: 'Issuance updated',
  ISSUANCE_ISSUED: 'Document issued — QR and signature block generated',
  ISSUANCE_REVOKED: 'Issuance revoked',
}

export async function AuditTimeline({ issuanceId }: AuditTimelineProps) {
  const events = await db.auditEvent.findMany({
    where: { entityId: issuanceId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      action: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
      meta: true,
    },
  })

  if (events.length === 0) {
    return (
      <p className="text-[13px] text-[#6b7280]">No audit events recorded.</p>
    )
  }

  return (
    <ol className="flex flex-col gap-0" aria-label="Audit timeline">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1
        const label = ACTION_LABELS[event.action] ?? event.action

        return (
          <li key={event.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-[#1e3a5f] shrink-0 mt-1.5" aria-hidden="true" />
              {!isLast && (
                <div className="w-px flex-1 bg-[#e5e7eb] mt-1" aria-hidden="true" />
              )}
            </div>

            {/* Event content */}
            <div className={['pb-4', isLast ? '' : ''].join(' ')}>
              <p className="text-[13px] font-medium text-[#111827]">{label}</p>
              <p className="text-[12px] text-[#6b7280]">
                {event.actor ? `${event.actor.name ?? event.actor.email}` : 'System'}{' '}
                &bull;{' '}
                <time dateTime={event.createdAt.toISOString()}>
                  {new Intl.DateTimeFormat('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(event.createdAt))}
                </time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
