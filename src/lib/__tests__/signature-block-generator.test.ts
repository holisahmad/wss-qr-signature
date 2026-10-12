import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { generateSignatureBlock } from '../signature-block-generator'
import type { IssuanceWithRelations } from '@/types/issuance'
import { generateQR } from '../qr-generator'

function makeIssuance(overrides: Partial<IssuanceWithRelations> = {}): IssuanceWithRelations {
  const now = new Date('2024-01-15T10:00:00Z')
  return {
    id: 'test-id-1',
    ref: 'testref12345678901234',
    orgId: 'org-1',
    unitId: null,
    signerId: 'signer-1',
    title: 'Test Certificate of Completion',
    docNumber: 'DOC-2024-001',
    docType: 'Certificate',
    description: null,
    docDate: now,
    issuanceTimestamp: now,
    expiresAt: null,
    status: 'ISSUED',
    adminNotes: null,
    createdById: 'user-1',
    createdAt: now,
    updatedAt: now,
    org: {
      id: 'org-1',
      name: 'Example University',
      slug: 'example-university',
      logoPath: null,
      address: '123 Campus Rd',
      website: 'https://example.edu',
      createdAt: now,
      updatedAt: now,
    },
    unit: null,
    signer: {
      id: 'signer-1',
      orgId: 'org-1',
      fullName: 'Dr. Jane Smith',
      title: 'Dean of Engineering',
      employeeId: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    createdBy: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
    assets: [],
    statusHistory: [],
    ...overrides,
  }
}

describe('signature-block-generator', () => {
  it('generates a valid PNG buffer with default 800×200 dimensions', async () => {
    const issuance = makeIssuance()
    const qrBuffer = await generateQR('https://example.com/verify/test', null)
    const buffer = await generateSignatureBlock(issuance, qrBuffer)

    expect(Buffer.isBuffer(buffer)).toBe(true)
    // Must be a valid PNG
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50)
    expect(buffer[2]).toBe(0x4e)
    expect(buffer[3]).toBe(0x47)
  })

  it('output buffer is at least 10 KB', async () => {
    const issuance = makeIssuance()
    const qrBuffer = await generateQR('https://example.com/verify/test', null)
    const buffer = await generateSignatureBlock(issuance, qrBuffer)

    expect(buffer.length).toBeGreaterThan(10 * 1024)
  })

  it('output dimensions match default 800×200', async () => {
    const issuance = makeIssuance()
    const qrBuffer = await generateQR('https://example.com/verify/test', null)
    const buffer = await generateSignatureBlock(issuance, qrBuffer)

    const meta = await sharp(buffer).metadata()
    expect(meta.width).toBe(800)
    expect(meta.height).toBe(200)
  })

  it('respects custom dimensions', async () => {
    const issuance = makeIssuance()
    const qrBuffer = await generateQR('https://example.com/verify/test', null)
    const buffer = await generateSignatureBlock(issuance, qrBuffer, { width: 600, height: 150 })

    const meta = await sharp(buffer).metadata()
    expect(meta.width).toBe(600)
    expect(meta.height).toBe(150)
  })

  it('handles missing logo path gracefully', async () => {
    const issuance = makeIssuance({
      org: {
        id: 'org-1',
        name: 'Example University',
        slug: 'example-university',
        logoPath: '/nonexistent/path.png', // invalid path
        address: null,
        website: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const qrBuffer = await generateQR('https://example.com/verify/test', null)

    // Should not throw even with invalid logo path
    const buffer = await generateSignatureBlock(issuance, qrBuffer)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('generates transparent background when requested', async () => {
    const issuance = makeIssuance()
    const qrBuffer = await generateQR('https://example.com/verify/test', null)
    const buffer = await generateSignatureBlock(issuance, qrBuffer, { background: 'transparent' })

    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
