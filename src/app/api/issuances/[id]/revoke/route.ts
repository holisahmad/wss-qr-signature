import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { assertTransition } from '@/lib/issuance-state-machine'
import { RevokeIssuanceSchema } from '@/lib/schemas/issuance'
import { issuanceWithRelationsInclude } from '@/types/issuance'


type RouteContext = { params: Promise<{ id: string }> }

// POST /api/issuances/[id]/revoke — transition ISSUED → REVOKED
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
    assertTransition(issuance.status, 'REVOKED')
  } catch (err) {
    return apiError('CONFLICT', err instanceof Error ? err.message : 'Invalid transition', 409)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = RevokeIssuanceSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const { reason } = parsed.data

  const updated = await db.$transaction(async (tx) => {
    await tx.issuanceStatusHistory.create({
      data: {
        issuanceId: id,
        fromStatus: issuance.status,
        toStatus: 'REVOKED',
        reason,
        actorId: session.user.id,
      },
    })

    return tx.documentIssuance.update({
      where: { id },
      data: { status: 'REVOKED' },
      include: issuanceWithRelationsInclude,
    })
  })

  await writeAuditEvent({
    action: 'ISSUANCE_REVOKED',
    entityType: 'DocumentIssuance',
    entityId: id,
    actorId: session.user.id,
    meta: { ref: issuance.ref, reason },
    ip,
  })

  return apiSuccess(updated)
}
