import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'

const UpdateUnitSchema = z
  .object({
    name: z.string().min(1).max(255),
    code: z.string().max(50).nullable(),
  })
  .partial()

// PATCH /api/organizations/[id]/units/[unitId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id, unitId } = await params

  const existing = await db.organizationalUnit.findFirst({
    where: { id: unitId, orgId: id },
    select: { id: true },
  })
  if (!existing) {
    return apiError('NOT_FOUND', 'Unit not found', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = UpdateUnitSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const unit = await db.organizationalUnit.update({
    where: { id: unitId },
    data: parsed.data,
  })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined
  await writeAuditEvent({
    action: 'UNIT_UPDATED',
    entityType: 'OrganizationalUnit',
    entityId: unitId,
    actorId: session.user.id,
    meta: { changes: parsed.data },
    ip,
  })

  return apiSuccess(unit)
}

// DELETE /api/organizations/[id]/units/[unitId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; unitId: string }> }
) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id, unitId } = await params

  const existing = await db.organizationalUnit.findFirst({
    where: { id: unitId, orgId: id },
    select: { id: true, _count: { select: { issuances: true } } },
  })
  if (!existing) {
    return apiError('NOT_FOUND', 'Unit not found', 404)
  }

  if (existing._count.issuances > 0) {
    return apiError(
      'CONFLICT',
      `Cannot delete unit: it has ${existing._count.issuances} associated issuances`,
      409
    )
  }

  await db.organizationalUnit.delete({ where: { id: unitId } })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined
  await writeAuditEvent({
    action: 'UNIT_DELETED',
    entityType: 'OrganizationalUnit',
    entityId: unitId,
    actorId: session.user.id,
    meta: { orgId: id },
    ip,
  })

  return apiSuccess({ deleted: true })
}
