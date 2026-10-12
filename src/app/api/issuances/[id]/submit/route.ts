import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { assertTransition } from '@/lib/issuance-state-machine'
import { issuanceWithRelationsInclude } from '@/types/issuance'


type RouteContext = { params: Promise<{ id: string }> }

// POST /api/issuances/[id]/submit — transition DRAFT → ISSUED
// Note: per plan the state machine goes DRAFT→ISSUED directly (no PENDING state in schema)
export async function POST(request: NextRequest, context: RouteContext) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await context.params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined

  const issuance = await db.documentIssuance.findUnique({
    where: { id },
    select: { id: true, status: true, ref: true },
  })

  if (!issuance) {
    return apiError('NOT_FOUND', 'Issuance not found', 404)
  }

  try {
    assertTransition(issuance.status, 'ISSUED')
  } catch (err) {
    return apiError('CONFLICT', err instanceof Error ? err.message : 'Invalid transition', 409)
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.issuanceStatusHistory.create({
      data: {
        issuanceId: id,
        fromStatus: issuance.status,
        toStatus: 'ISSUED',
        actorId: session.user.id,
      },
    })

    return tx.documentIssuance.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: issuanceWithRelationsInclude,
    })
  })

  await writeAuditEvent({
    action: 'ISSUANCE_SUBMITTED',
    entityType: 'DocumentIssuance',
    entityId: id,
    actorId: session.user.id,
    meta: { ref: issuance.ref },
    ip,
  })

  return apiSuccess(updated)
}
