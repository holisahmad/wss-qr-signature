import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError, apiValidationError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'


const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  address: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable(),
})

// POST /api/organizations — create organization
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

  const parsed = CreateOrganizationSchema.safeParse(body)
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues)
  }

  const input = parsed.data

  // Slug uniqueness check
  const existing = await db.organization.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  })

  if (existing) {
    return apiError('CONFLICT', `Organization with slug "${input.slug}" already exists`, 409)
  }

  const org = await db.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      address: input.address ?? null,
      website: input.website ?? null,
    },
  })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined
  await writeAuditEvent({
    action: 'ORGANIZATION_CREATED',
    entityType: 'Organization',
    entityId: org.id,
    actorId: session.user.id,
    meta: { name: org.name, slug: org.slug },
    ip,
  })

  return apiSuccess(org, 201)
}

// GET /api/organizations — list all organizations
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const orgs = await db.organization.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      logoPath: true,
      address: true,
      website: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { issuances: true, units: true, signers: true },
      },
    },
  })

  return apiSuccess(orgs)
}
