import type { IssuanceWithRelations } from '@/types/issuance'

export interface SignatureBlockOptions {
  width?: number
  height?: number
  background?: 'white' | 'transparent'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CanvasModule = {
  createCanvas: (width: number, height: number) => any
  loadImage: (src: string | Buffer) => Promise<any>
}

let canvasModule: CanvasModule | null = null

async function getCanvasModule(): Promise<CanvasModule> {
  if (canvasModule) return canvasModule

  try {
    const napiCanvas = await import('@napi-rs/canvas')
    canvasModule = {
      createCanvas: napiCanvas.createCanvas,
      loadImage: napiCanvas.loadImage as (src: string | Buffer) => Promise<unknown>,
    } as CanvasModule
    return canvasModule
  } catch {
    try {
      // Use createRequire so Turbopack/webpack skip static analysis on the fallback
      const { createRequire } = await import('module')
      const req = createRequire(import.meta.url)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const nodeCanvas = req('canvas')
      canvasModule = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        createCanvas: nodeCanvas.createCanvas as CanvasModule['createCanvas'],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        loadImage: nodeCanvas.loadImage as CanvasModule['loadImage'],
      }
      return canvasModule
    } catch {
      throw new Error(
        'Neither @napi-rs/canvas nor canvas (node-canvas) is available. ' +
          'Install one of them to generate signature blocks.'
      )
    }
  }
}

/**
 * Generate an 800×200px PNG signature block.
 *
 * Layout:
 *   [ORG LOGO 160×160] | [QR 160×160] | [METADATA TEXT]
 *
 * Returns a PNG buffer.
 */
export async function generateSignatureBlock(
  issuance: IssuanceWithRelations,
  qrBuffer: Buffer,
  opts: SignatureBlockOptions = {}
): Promise<Buffer> {
  const { createCanvas, loadImage } = await getCanvasModule()

  const width = opts.width ?? 800
  const height = opts.height ?? 200
  const bgStyle = opts.background ?? 'white'

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const canvas = createCanvas(width, height)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const ctx = canvas.getContext('2d')

  // Background
  if (bgStyle === 'white') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.fillStyle = '#ffffff'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.fillRect(0, 0, width, height)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.clearRect(0, 0, width, height)
  }

  const colPadding = 10
  const imgSize = 160
  const imgTop = Math.floor((height - imgSize) / 2)

  // Column boundaries
  const col1Left = colPadding
  const col2Left = col1Left + imgSize + colPadding * 2
  const col3Left = col2Left + imgSize + colPadding * 2

  // === Column 1: Org logo ===
  const logoPath = issuance.org.logoPath
  if (logoPath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const img = await loadImage(logoPath)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ctx.drawImage(img, col1Left, imgTop, imgSize, imgSize)
    } catch {
      // Logo failed to load — draw placeholder box
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ctx.fillStyle = '#e5e7eb'
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ctx.fillRect(col1Left, imgTop, imgSize, imgSize)
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.fillStyle = '#e5e7eb'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.fillRect(col1Left, imgTop, imgSize, imgSize)
  }

  // === Column 2: QR code ===
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const qrImg = await loadImage(qrBuffer)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.drawImage(qrImg, col2Left, imgTop, imgSize, imgSize)
  } catch {
    // Fallback placeholder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.fillStyle = '#f3f4f6'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.fillRect(col2Left, imgTop, imgSize, imgSize)
  }

  // === Column 3: Metadata text ===
  const textX = col3Left
  const lineGap = 18
  let lineY = 28

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function drawLine(text: string, fontSize: number, color: string, bold = false): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.font = `${bold ? 'bold ' : ''}${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ctx.fillStyle = color
    const maxWidth = width - textX - colPadding
    const truncated = truncateText(ctx, text, maxWidth)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ctx.fillText(truncated, textX, lineY)
    lineY += lineGap
  }

  // Organization name — bold 14px navy
  drawLine(issuance.org.name, 14, '#1e3a5f', true)

  // Document title — 12px dark, truncate at 60 chars
  const titleText =
    issuance.title.length > 60 ? issuance.title.slice(0, 57) + '...' : issuance.title
  drawLine(titleText, 12, '#111827')

  // Document number — 11px monospace-style
  drawLine(`No: ${issuance.docNumber}`, 11, '#374151')

  // Signer
  drawLine(`${issuance.signer.fullName} — ${issuance.signer.title}`, 10, '#374151')

  // Issue date
  const issueDate = issuance.issuanceTimestamp.toISOString().split('T')[0]
  drawLine(`Issued: ${issueDate}`, 10, '#6b7280')

  // Reference code
  drawLine(`Ref: ${issuance.ref}`, 9, '#9ca3af')

  // Divider line between logo/qr and text
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ctx.strokeStyle = '#e5e7eb'
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  ctx.lineWidth = 1
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ctx.beginPath()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ctx.moveTo(col3Left - colPadding, 10)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ctx.lineTo(col3Left - colPadding, height - 10)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  ctx.stroke()

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return canvas.toBuffer('image/png') as Buffer
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function truncateText(ctx: any, text: string, maxWidth: number): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  if ((ctx.measureText(text) as { width: number }).width <= maxWidth) return text
  let truncated = text
  while (
    truncated.length > 0 &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (ctx.measureText(truncated + '…') as { width: number }).width > maxWidth
  ) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '…'
}
