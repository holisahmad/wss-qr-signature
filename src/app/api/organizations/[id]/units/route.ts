import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'

const CreateUnitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  code: z.string().max(50).optional().nullable(),
})

// GET /api/organizations/[id]/units
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

  const units = await db.organizationalUnit.findMany({
    where: { orgId: id },
    orderBy: { name: 'asc' },
  })

  return apiSuccess(units)
}

// POST /api/organizations/[id]/units
export async function POST(
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

  const org = await db.organization.findUnique({ where: { id }, select: { id: true } })
  if (!org) {
    return apiError('NOT_FOUND', 'Organization not found', 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = CreateUnitSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const unit = await db.organizationalUnit.create({
    data: {
      orgId: id,
      name: parsed.data.name,
      code: parsed.data.code ?? null,
    },
  })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined
  await writeAuditEvent({
    action: 'UNIT_CREATED',
    entityType: 'OrganizationalUnit',
    entityId: unit.id,
    actorId: session.user.id,
    meta: { orgId: id, name: unit.name },
    ip,
  })

  return apiSuccess(unit, 201)
}
