import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { CreateIssuanceSchema } from '@/lib/schemas/issuance'
import type { DocumentStatus } from '@/generated/prisma/enums'


// POST /api/issuances — create a draft issuance
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

  const parsed = CreateIssuanceSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const input = parsed.data

  // Duplicate check: same docNumber + orgId
  const existing = await db.documentIssuance.findFirst({
    where: { docNumber: input.docNumber, orgId: input.orgId },
    select: { id: true, ref: true, status: true },
  })

  if (existing) {
    return apiError(
      'CONFLICT',
      `A document with number "${input.docNumber}" already exists for this organization`,
      409,
      { existingRef: existing.ref, existingStatus: existing.status }
    )
  }

  const ref = nanoid(21)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined

  const issuance = await db.documentIssuance.create({
    data: {
      ref,
      orgId: input.orgId,
      unitId: input.unitId ?? null,
      signerId: input.signerId,
      title: input.title,
      docNumber: input.docNumber,
      docType: input.docType,
      description: input.description ?? null,
      docDate: new Date(input.docDate),
      issuanceTimestamp: new Date(input.issuanceTimestamp),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      adminNotes: input.adminNotes ?? null,
      createdById: session.user.id,
      status: 'DRAFT',
    },
    include: {
      org: true,
      unit: true,
      signer: true,
      createdBy: { select: { id: true, email: true, name: true } },
    },
  })

  await writeAuditEvent({
    action: 'ISSUANCE_CREATED',
    entityType: 'DocumentIssuance',
    entityId: issuance.id,
    actorId: session.user.id,
    meta: { ref: issuance.ref, title: issuance.title },
    ip,
  })

  return apiSuccess(issuance, 201)
}

// GET /api/issuances — list with pagination + filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { searchParams } = request.nextUrl

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20))
  const search = searchParams.get('search') ?? undefined
  const status = searchParams.get('status') as DocumentStatus | null
  const orgId = searchParams.get('orgId') ?? undefined
  const unitId = searchParams.get('unitId') ?? undefined
  const dateFrom = searchParams.get('dateFrom') ?? undefined
  const dateTo = searchParams.get('dateTo') ?? undefined
  const sort = searchParams.get('sort') ?? 'newest'

  const where = {
    ...(status ? { status } : {}),
    ...(orgId ? { orgId } : {}),
    ...(unitId ? { unitId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { docNumber: { contains: search } },
            { ref: { contains: search } },
            { signer: { fullName: { contains: search } } },
          ],
        }
      : {}),
  }

  const orderBy =
    sort === 'oldest'
      ? { createdAt: 'asc' as const }
      : sort === 'title'
        ? { title: 'asc' as const }
        : sort === 'docNumber'
          ? { docNumber: 'asc' as const }
          : { createdAt: 'desc' as const } // default: newest

  const [total, data] = await db.$transaction([
    db.documentIssuance.count({ where }),
    db.documentIssuance.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        org: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        signer: { select: { id: true, fullName: true, title: true } },
        assets: { select: { id: true, type: true } },
      },
    }),
  ])

  return apiSuccess({ data, total, page, limit })
}
