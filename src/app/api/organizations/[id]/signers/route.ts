import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'

// GET /api/organizations/[id]/signers
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

  const signers = await db.signer.findMany({
    where: { orgId: id, isActive: true, deletedAt: null },
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      fullName: true,
      title: true,
      employeeId: true,
      isActive: true,
    },
  })

  return apiSuccess(signers)
}
