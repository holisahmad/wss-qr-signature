import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'


// GET /api/admin/stats — dashboard counts
export async function GET(_request: NextRequest) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [total, issued, revoked, expired, draft, issuedThisMonth] = await db.$transaction([
    db.documentIssuance.count(),
    db.documentIssuance.count({ where: { status: 'ISSUED' } }),
    db.documentIssuance.count({ where: { status: 'REVOKED' } }),
    db.documentIssuance.count({ where: { status: 'EXPIRED' } }),
    db.documentIssuance.count({ where: { status: 'DRAFT' } }),
    db.documentIssuance.count({
      where: {
        status: 'ISSUED',
        issuanceTimestamp: { gte: firstOfMonth },
      },
    }),
  ])

  return apiSuccess({
    total,
    issued,
    revoked,
    expired,
    draft,
    issuedThisMonth,
  })
}
