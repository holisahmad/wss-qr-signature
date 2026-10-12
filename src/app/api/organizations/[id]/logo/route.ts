import { NextRequest } from 'next/server'
import { nanoid } from 'nanoid'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'
import { apiSuccess, apiError } from '@/lib/api-response'
import { writeAuditEvent } from '@/lib/audit'


type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

// POST /api/organizations/[id]/logo — upload and normalize org logo
export async function POST(request: NextRequest, context: RouteContext) {
  let session
  try {
    session = await requireAdmin()
  } catch (err) {
    if (err instanceof Response) return err
    return apiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  const { id } = await context.params

  const org = await db.organization.findUnique({
    where: { id },
    select: { id: true, name: true, logoPath: true },
  })

  if (!org) {
    return apiError('NOT_FOUND', 'Organization not found', 404)
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return apiError('BAD_REQUEST', 'Could not parse multipart form data', 400)
  }

  const file = formData.get('logo')
  if (!file || !(file instanceof File)) {
    return apiError('BAD_REQUEST', 'logo field is required', 400)
  }

  // MIME validation (server-side)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return apiError(
      'UNSUPPORTED_MEDIA_TYPE',
      `File type "${file.type}" is not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
      415
    )
  }

  // Size validation
  if (file.size > MAX_SIZE_BYTES) {
    return apiError('PAYLOAD_TOO_LARGE', 'Logo file must be ≤ 2 MB', 413)
  }

  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)

  // Normalize to ≤ 300×300 px, preserve aspect ratio
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'png'
  let normalizedBuffer: Buffer

  try {
    // SVG → PNG rasterization + resize; PNG/JPEG → resize
    normalizedBuffer = await sharp(inputBuffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
  } catch {
    return apiError('UNPROCESSABLE_ENTITY', 'Could not process image file', 422)
  }

  // Save to UPLOAD_DIR/logos/
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
  const logosDir = path.join(uploadDir, 'logos')
  fs.mkdirSync(logosDir, { recursive: true })

  const filename = `${nanoid(16)}.${ext}`
  const logoFilePath = path.join(logosDir, filename)
  fs.writeFileSync(logoFilePath, normalizedBuffer)

  // Remove old logo file if it exists
  if (org.logoPath) {
    try {
      fs.unlinkSync(org.logoPath)
    } catch {
      // Non-fatal: old file may already be gone
    }
  }

  // Update organization record
  const updated = await db.organization.update({
    where: { id },
    data: { logoPath: logoFilePath },
    select: { id: true, name: true, logoPath: true },
  })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined
  await writeAuditEvent({
    action: 'LOGO_UPLOADED',
    entityType: 'Organization',
    entityId: id,
    actorId: session.user.id,
    meta: { filename, size: normalizedBuffer.length },
    ip,
  })

  return apiSuccess({ logoPath: updated.logoPath })
}
