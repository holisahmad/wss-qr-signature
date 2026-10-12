import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'

const UpdateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(255),
    address: z.string().max(500).nullable(),
    website: z.string().url().nullable(),
  })
  .partial()

// GET /api/organizations/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await params

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      units: { orderBy: { name: 'asc' } },
      signers: { where: { isActive: true }, orderBy: { fullName: 'asc' } },
      _count: { select: { issuances: true } },
    },
  })

  if (!org) {
    return apiError('NOT_FOUND', 'Organization not found', 404)
  }

  return apiSuccess(org)
}

// PATCH /api/organizations/[id]
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = UpdateOrganizationSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const existing = await db.organization.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return apiError('NOT_FOUND', 'Organization not found', 404)
  }

  const org = await db.organization.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.address !== undefined && { address: parsed.data.address }),
      ...(parsed.data.website !== undefined && { website: parsed.data.website }),
    },
  })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined
  await writeAuditEvent({
    action: 'ORGANIZATION_UPDATED',
    entityType: 'Organization',
    entityId: org.id,
    actorId: session.user.id,
    meta: { changes: parsed.data },
    ip,
  })

  return apiSuccess(org)
}
