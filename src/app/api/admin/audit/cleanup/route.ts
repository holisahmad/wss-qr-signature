import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'

// POST /api/admin/audit/cleanup — delete AuditEvents older than 60 days
export async function POST(_request: NextRequest) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const result = await db.auditEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  await writeAuditEvent({
    action: 'AUDIT_CLEANUP',
    entityType: 'AuditEvent',
    entityId: 'bulk',
    actorId: session.user.id,
    meta: { deletedCount: result.count, cutoffDate: cutoff.toISOString() },
  })

  return apiSuccess({ deletedCount: result.count, cutoffDate: cutoff.toISOString() })
}
