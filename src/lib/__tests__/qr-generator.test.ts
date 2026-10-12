import { describe, it, expect } from 'vitest'
import jsQR from 'jsqr'
import sharp from 'sharp'
import { generateQR } from '../qr-generator'

const TEST_URL = 'https://qr.example.com/verify/abc123def456ghi7890ab'

describe('qr-generator', () => {
  it('generates a valid PNG buffer without logo', async () => {
    const buffer = await generateQR(TEST_URL)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)

    // Verify it's actually a PNG (starts with PNG signature bytes)
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50) // 'P'
    expect(buffer[2]).toBe(0x4e) // 'N'
    expect(buffer[3]).toBe(0x47) // 'G'
  })

  it('generates a valid PNG buffer with null logo (no-op)', async () => {
    const buffer = await generateQR(TEST_URL, null)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('output decodes back to the expected URL', async () => {
    const buffer = await generateQR(TEST_URL)

    // Convert to raw RGBA for jsQR
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const result = jsQR(new Uint8ClampedArray(data.buffer), info.width, info.height)
    expect(result).not.toBeNull()
    expect(result?.data).toBe(TEST_URL)
  })

  it('falls back gracefully when logo path does not exist', async () => {
    // Non-existent logo path should not throw; should fall back to no-logo QR
    const buffer = await generateQR(TEST_URL, '/nonexistent/logo.png')
    expect(Buffer.isBuffer(buffer)).toBe(true)

    // Should still decode correctly
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const result = jsQR(new Uint8ClampedArray(data.buffer), info.width, info.height)
    expect(result).not.toBeNull()
    expect(result?.data).toBe(TEST_URL)
  })
})
