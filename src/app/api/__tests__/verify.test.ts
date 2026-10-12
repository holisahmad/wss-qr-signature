import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the db module so no actual SQLite is touched
vi.mock('@/lib/db', () => ({
  db: {
    documentIssuance: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock the rate limiter to always allow in tests
vi.mock('@/lib/rate-limit', () => ({
  publicRateLimiter: {
    check: vi.fn().mockReturnValue(true),
  },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

import { GET } from '@/app/api/verify/[ref]/route'
import { db } from '@/lib/db'
import { publicRateLimiter } from '@/lib/rate-limit'

const mockFindUnique = vi.mocked(db.documentIssuance.findUnique)
const mockRateLimiterCheck = vi.mocked(publicRateLimiter.check)

/** Minimal shape matching what the route selects from Prisma */
function buildMockDbResult(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-15T08:00:00.000Z')
  return {
    ref: 'ABC123def456ghi7890ab',
    status: 'ISSUED' as const,
    title: 'Certificate of Participation',
    docNumber: 'CERT/TEST/2024/001',
    docType: 'Certificate',
    docDate: now,
    issuanceTimestamp: now,
    expiresAt: null,
    org: {
      name: 'Test Organization',
      logoPath: null,
    },
    unit: { name: 'Test Unit' },
    signer: {
      fullName: 'Test Signer',
      title: 'Director of Testing',
    },
    ...overrides,
  }
}

function makeRequest(ref: string) {
  const url = `http://localhost:3000/api/verify/${ref}`
  return new NextRequest(url)
}

describe('GET /api/verify/[ref]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRateLimiterCheck.mockReturnValue(true)
  })

  it('returns 200 with public fields for a known ref', async () => {
    mockFindUnique.mockResolvedValueOnce(buildMockDbResult() as never)

    const response = await GET(makeRequest('ABC123def456ghi7890ab'), {
      params: Promise.resolve({ ref: 'ABC123def456ghi7890ab' }),
    })

    expect(response.status).toBe(200)

    const body = await response.json() as { data: Record<string, unknown> }
    expect(body.data).toBeDefined()
    expect(body.data.ref).toBe('ABC123def456ghi7890ab')
    expect(body.data.status).toBe('ISSUED')
  })

  it('includes expected public fields in the response', async () => {
    mockFindUnique.mockResolvedValueOnce(buildMockDbResult() as never)

    const response = await GET(makeRequest('ABC123def456ghi7890ab'), {
      params: Promise.resolve({ ref: 'ABC123def456ghi7890ab' }),
    })

    const body = await response.json() as { data: Record<string, unknown> }
    const data = body.data

    expect(data.ref).toBeDefined()
    expect(data.status).toBeDefined()
    expect(data.organization).toBeDefined()
    expect(data.signer).toBeDefined()
    expect(data.document).toBeDefined()
  })

  it('does NOT contain adminNotes, createdById, or email fields in response', async () => {
    mockFindUnique.mockResolvedValueOnce(buildMockDbResult() as never)

    const response = await GET(makeRequest('ABC123def456ghi7890ab'), {
      params: Promise.resolve({ ref: 'ABC123def456ghi7890ab' }),
    })

    const text = await response.text()

    expect(text).not.toContain('adminNotes')
    expect(text).not.toContain('createdById')
    expect(text).not.toContain('passwordHash')
  })

  it('returns 404 for an unknown ref', async () => {
    mockFindUnique.mockResolvedValueOnce(null)

    const response = await GET(makeRequest('unknown-ref-000'), {
      params: Promise.resolve({ ref: 'unknown-ref-000' }),
    })

    expect(response.status).toBe(404)
  })

  it('returns 429 when rate limiter rejects', async () => {
    mockRateLimiterCheck.mockReturnValue(false)

    const response = await GET(makeRequest('any-ref'), {
      params: Promise.resolve({ ref: 'any-ref' }),
    })

    expect(response.status).toBe(429)
  })

  it('returns REVOKED status correctly', async () => {
    mockFindUnique.mockResolvedValueOnce(buildMockDbResult({ status: 'REVOKED' }) as never)

    const response = await GET(makeRequest('REVOKED-ref'), {
      params: Promise.resolve({ ref: 'REVOKED-ref' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json() as { data: { status: string } }
    expect(body.data.status).toBe('REVOKED')
  })
})
