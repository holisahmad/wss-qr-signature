import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'

// GET /api/admin/audit — paginated audit events (hard 60-day cutoff)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const action = searchParams.get('action')?.trim() ?? ''
  const actorId = searchParams.get('actorId')?.trim() ?? ''
  const dateFrom = searchParams.get('dateFrom')?.trim() ?? ''
  const dateTo = searchParams.get('dateTo')?.trim() ?? ''

  // Hard 60-day retention cutoff
  const hardCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  // Build createdAt constraint — intersection of hard cutoff + user-provided range
  const createdAtFilter: { gte?: Date; lte?: Date } = { gte: hardCutoff }
  if (dateFrom) {
    const from = new Date(dateFrom)
    if (!isNaN(from.getTime()) && from > hardCutoff) {
      createdAtFilter.gte = from
    }
  }
  if (dateTo) {
    const to = new Date(dateTo)
    // set to end of day
    to.setHours(23, 59, 59, 999)
    if (!isNaN(to.getTime())) {
      createdAtFilter.lte = to
    }
  }

  const where: Record<string, unknown> = { createdAt: createdAtFilter }
  if (action) where.action = action
  if (actorId) where.actorId = actorId

  const [data, total] = await db.$transaction([
    db.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        meta: true,
        actor: {
          select: { id: true, email: true, name: true },
        },
      },
    }),
    db.auditEvent.count({ where }),
  ])

  return apiSuccess({ data, total, page, limit })
}
