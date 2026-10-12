import QRCode from 'qrcode'
import sharp from 'sharp'
import jsQR from 'jsqr'

const QR_SIZE = 800
const LOGO_SIZE = 160
const LOGO_PADDING = 8

/**
 * Generate a QR code PNG buffer containing verificationUrl.
 * Error correction level H (30% damage tolerance) allows logo overlay.
 * Validates the generated QR is decodable before returning.
 * Falls back to no-logo if logo overlay would corrupt the QR.
 */
export async function generateQR(
  verificationUrl: string,
  logoPath?: string | null
): Promise<Buffer> {
  // Step 1: generate base QR at 800×800 with error correction H
  const baseQrBuffer = await generateBaseQr(verificationUrl)

  if (!logoPath) {
    return baseQrBuffer
  }

  // Step 2: attempt logo overlay
  try {
    const withLogo = await overlayLogo(baseQrBuffer, logoPath)

    // Step 3: validate the result is still scannable
    const decoded = await decodeQr(withLogo)
    if (decoded === verificationUrl) {
      return withLogo
    }

    // Decoded URL doesn't match — fall back to no-logo
    console.warn('[qr-generator] Logo overlay degraded QR scannability, falling back to no-logo')
    return baseQrBuffer
  } catch (err) {
    // Logo processing failed — fall back to no-logo
    console.warn('[qr-generator] Logo overlay failed, falling back to no-logo:', err)
    return baseQrBuffer
  }
}

async function generateBaseQr(url: string): Promise<Buffer> {
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    width: QR_SIZE,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })

  // Convert data URL to buffer via sharp
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  const inputBuffer = Buffer.from(base64, 'base64')

  // Ensure exact output size via sharp
  const output = await sharp(inputBuffer)
    .resize(QR_SIZE, QR_SIZE, { fit: 'fill' })
    .png()
    .toBuffer()

  return output
}

async function overlayLogo(qrBuffer: Buffer, logoPath: string): Promise<Buffer> {
  const paddedSize = LOGO_SIZE + LOGO_PADDING * 2

  // Resize logo and add white padding background
  const logoWithPadding = await sharp(logoPath)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({
      top: LOGO_PADDING,
      bottom: LOGO_PADDING,
      left: LOGO_PADDING,
      right: LOGO_PADDING,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer()

  // Center the logo on the QR
  const offset = Math.floor((QR_SIZE - paddedSize) / 2)

  const result = await sharp(qrBuffer)
    .composite([
      {
        input: logoWithPadding,
        top: offset,
        left: offset,
      },
    ])
    .png()
    .toBuffer()

  return result
}

/** Decode a QR PNG buffer and return its text content, or null on failure */
async function decodeQr(qrBuffer: Buffer): Promise<string | null> {
  try {
    // Convert to raw RGBA via sharp for jsQR
    const { data, info } = await sharp(qrBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const result = jsQR(
      new Uint8ClampedArray(data.buffer),
      info.width,
      info.height
    )

    return result ? result.data : null
  } catch {
    return null
  }
}
