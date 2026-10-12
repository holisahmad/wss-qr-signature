import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiSuccess, apiError } from '@/lib/api-response'
import { publicRateLimiter, getClientIp } from '@/lib/rate-limit'


type RouteContext = { params: Promise<{ ref: string }> }

// GET /api/verify/[ref] — PUBLIC verification endpoint
// Rate-limited, returns only public-safe fields
export async function GET(request: NextRequest, context: RouteContext) {
  // Rate limiting: 20 req/min per IP
  const ip = getClientIp(request)
  const allowed = publicRateLimiter.check(ip, 20, 60_000)

  if (!allowed) {
    return apiError('RATE_LIMITED', 'Too many requests. Please wait before trying again.', 429)
  }

  const { ref } = await context.params

  const issuance = await db.documentIssuance.findUnique({
    where: { ref },
    select: {
      ref: true,
      status: true,
      title: true,
      docNumber: true,
      docType: true,
      docDate: true,
      issuanceTimestamp: true,
      expiresAt: true,
      org: {
        select: {
          name: true,
          logoPath: true,
        },
      },
      unit: {
        select: {
          name: true,
        },
      },
      signer: {
        select: {
          fullName: true,
          title: true,
        },
      },
    },
  })

  // Return 404 for unknown refs — no information leakage
  if (!issuance) {
    return apiError('NOT_FOUND', 'Verification record not found', 404)
  }

  // Return only public-safe fields — no adminNotes, no createdById, no emails, no internal IDs
  const publicData = {
    ref: issuance.ref,
    status: issuance.status,
    organization: {
      name: issuance.org.name,
      logoPath: issuance.org.logoPath,
    },
    organizationalUnit: issuance.unit ? { name: issuance.unit.name } : null,
    signer: {
      fullName: issuance.signer.fullName,
      title: issuance.signer.title,
    },
    document: {
      title: issuance.title,
      docNumber: issuance.docNumber,
      docType: issuance.docType,
      docDate: issuance.docDate,
      issuanceTimestamp: issuance.issuanceTimestamp,
      expiresAt: issuance.expiresAt,
    },
  }

  return apiSuccess(publicData)
}
