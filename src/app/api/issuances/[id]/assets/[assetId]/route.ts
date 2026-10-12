import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiError } from '@/lib/api-response'


type RouteContext = { params: Promise<{ id: string; assetId: string }> }

// GET /api/issuances/[id]/assets/[assetId] — download generated asset
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id, assetId } = await context.params

  const asset = await db.generatedAsset.findUnique({
    where: { id: assetId },
    select: { id: true, issuanceId: true, filePath: true, mimeType: true, type: true },
  })

  if (!asset || asset.issuanceId !== id) {
    return apiError('NOT_FOUND', 'Asset not found', 404)
  }

  // Prevent path traversal
  const resolvedPath = path.resolve(asset.filePath)
  if (!fs.existsSync(resolvedPath)) {
    return apiError('NOT_FOUND', 'Asset file not found on disk', 404)
  }

  const fileBuffer = fs.readFileSync(resolvedPath)
  const filename =
    asset.type === 'QR_PNG' ? 'qr-code.png' : 'signature-block.png'

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
