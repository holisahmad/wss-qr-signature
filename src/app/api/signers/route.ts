import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { CreateSignerSchema } from '@/lib/schemas/signer'

// GET /api/signers?orgId=...&search=...&page=...&limit=...
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { searchParams } = request.nextUrl
  const orgId = searchParams.get('orgId') ?? ''
  const search = searchParams.get('search')?.trim() ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  if (!orgId) {
    return apiError('VALIDATION_ERROR', 'orgId is required', 422)
  }

  const where = {
    orgId,
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search } },
            { title: { contains: search } },
            { employeeId: { contains: search } },
          ],
        }
      : {}),
  }

  const [data, total] = await db.$transaction([
    db.signer.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        fullName: true,
        title: true,
        employeeId: true,
        isActive: true,
        createdAt: true,
      },
    }),
    db.signer.count({ where }),
  ])

  return apiSuccess({ data, total, page, limit })
}

// POST /api/signers
export async function POST(request: NextRequest) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const parsed = CreateSignerSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const { orgId, fullName, title, employeeId, isActive } = parsed.data

  // Verify org exists
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true } })
  if (!org) {
    return apiError('NOT_FOUND', 'Organization not found', 404)
  }

  const signer = await db.signer.create({
    data: {
      orgId,
      fullName,
      title,
      employeeId: employeeId ?? null,
      isActive: isActive ?? true,
    },
  })

  await writeAuditEvent({
    action: 'SIGNER_CREATED',
    entityType: 'Signer',
    entityId: signer.id,
    actorId: session.user?.id,
    meta: { fullName: signer.fullName, orgId: signer.orgId },
  })

  return apiSuccess(signer, 201)
}
