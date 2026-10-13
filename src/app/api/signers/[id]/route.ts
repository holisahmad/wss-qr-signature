import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { UpdateSignerSchema } from '@/lib/schemas/signer'

// PATCH /api/signers/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await params

  const existing = await db.signer.findUnique({ where: { id } })
  if (!existing || existing.deletedAt !== null) {
    return apiError('NOT_FOUND', 'Signer not found', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = UpdateSignerSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const updated = await db.signer.update({
    where: { id },
    data: parsed.data,
  })

  await writeAuditEvent({
    action: 'SIGNER_UPDATED',
    entityType: 'Signer',
    entityId: id,
    actorId: session.user?.id,
    meta: { fullName: updated.fullName, changes: parsed.data },
  })

  return apiSuccess(updated)
}

// DELETE /api/signers/[id] — soft delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await params

  const existing = await db.signer.findUnique({ where: { id } })
  if (!existing || existing.deletedAt !== null) {
    return apiError('NOT_FOUND', 'Signer not found', 404)
  }

  await db.signer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })

  await writeAuditEvent({
    action: 'SIGNER_DELETED',
    entityType: 'Signer',
    entityId: id,
    actorId: session.user?.id,
    meta: { fullName: existing.fullName },
  })

  return apiSuccess({ deleted: true })
}
