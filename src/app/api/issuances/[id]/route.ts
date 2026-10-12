import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { UpdateIssuanceSchema } from '@/lib/schemas/issuance'
import { issuanceWithRelationsInclude } from '@/types/issuance'


type RouteContext = { params: Promise<{ id: string }> }

// GET /api/issuances/[id]
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await context.params

  const issuance = await db.documentIssuance.findUnique({
    where: { id },
    include: issuanceWithRelationsInclude,
  })

  if (!issuance) {
    return apiError('NOT_FOUND', 'Issuance not found', 404)
  }

  return apiSuccess(issuance)
}

// PATCH /api/issuances/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await context.params

  const issuance = await db.documentIssuance.findUnique({
    where: { id },
    select: { id: true, status: true, ref: true },
  })

  if (!issuance) {
    return apiError('NOT_FOUND', 'Issuance not found', 404)
  }

  if (issuance.status !== 'DRAFT') {
    return apiError(
      'CONFLICT',
      'Only DRAFT issuances can be edited',
      409,
      { currentStatus: issuance.status }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = UpdateIssuanceSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const input = parsed.data
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined

  const updated = await db.documentIssuance.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.docNumber !== undefined ? { docNumber: input.docNumber } : {}),
      ...(input.docType !== undefined ? { docType: input.docType } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
      ...(input.signerId !== undefined ? { signerId: input.signerId } : {}),
      ...(input.docDate !== undefined ? { docDate: new Date(input.docDate) } : {}),
      ...(input.issuanceTimestamp !== undefined
        ? { issuanceTimestamp: new Date(input.issuanceTimestamp) }
        : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
      ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
    },
    include: issuanceWithRelationsInclude,
  })

  await writeAuditEvent({
    action: 'ISSUANCE_UPDATED',
    entityType: 'DocumentIssuance',
    entityId: id,
    actorId: session.user.id,
    meta: { ref: issuance.ref, changes: Object.keys(input) },
    ip,
  })

  return apiSuccess(updated)
}
