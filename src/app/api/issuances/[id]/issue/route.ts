import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'
import { assertTransition } from '@/lib/issuance-state-machine'
import { generateQR } from '@/lib/qr-generator'
import { generateSignatureBlock } from '@/lib/signature-block-generator'
import { issuanceWithRelationsInclude } from '@/types/issuance'


type RouteContext = { params: Promise<{ id: string }> }

// POST /api/issuances/[id]/issue — transition DRAFT → ISSUED, generate QR + PNG assets
export async function POST(request: NextRequest, context: RouteContext) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await context.params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined

  // Load full issuance with relations
  const issuance = await db.documentIssuance.findUnique({
    where: { id },
    include: issuanceWithRelationsInclude,
  })

  if (!issuance) {
    return apiError('NOT_FOUND', 'Issuance not found', 404)
  }

  try {
    assertTransition(issuance.status, 'ISSUED')
  } catch (err) {
    return apiError('CONFLICT', err instanceof Error ? err.message : 'Invalid transition', 409)
  }

  // Build verification URL
  const baseUrl = process.env.BASE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/verify/${issuance.ref}`

  // Ensure UPLOAD_DIR/assets/ exists
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
  const assetsDir = path.join(uploadDir, 'assets')
  fs.mkdirSync(assetsDir, { recursive: true })

  // Generate QR PNG
  const qrBuffer = await generateQR(verificationUrl, issuance.org.logoPath)

  // Generate signature block PNG
  const sigBuffer = await generateSignatureBlock(issuance, qrBuffer)

  // Write files to disk
  const qrFilename = `${randomUUID()}.png`
  const sigFilename = `${randomUUID()}.png`
  const qrFilePath = path.join(assetsDir, qrFilename)
  const sigFilePath = path.join(assetsDir, sigFilename)

  fs.writeFileSync(qrFilePath, qrBuffer)
  fs.writeFileSync(sigFilePath, sigBuffer)

  // Transactional DB updates
  const updated = await db.$transaction(async (tx) => {
    // Create asset rows
    await tx.generatedAsset.createMany({
      data: [
        {
          issuanceId: id,
          type: 'QR_PNG',
          filePath: qrFilePath,
          fileSize: qrBuffer.length,
          mimeType: 'image/png',
        },
        {
          issuanceId: id,
          type: 'SIGNATURE_BLOCK',
          filePath: sigFilePath,
          fileSize: sigBuffer.length,
          mimeType: 'image/png',
        },
      ],
    })

    // Record status history
    await tx.issuanceStatusHistory.create({
      data: {
        issuanceId: id,
        fromStatus: issuance.status,
        toStatus: 'ISSUED',
        actorId: session.user.id,
      },
    })

    // Update issuance status
    return tx.documentIssuance.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: issuanceWithRelationsInclude,
    })
  })

  await writeAuditEvent({
    action: 'ISSUANCE_ISSUED',
    entityType: 'DocumentIssuance',
    entityId: id,
    actorId: session.user.id,
    meta: { ref: issuance.ref, verificationUrl },
    ip,
  })

  return apiSuccess(updated)
}
