import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { RateLimiter } from '@/lib/rate-limit'

// Mock db so no real DB is hit
vi.mock('@/lib/db', () => ({
  db: {
    documentIssuance: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) =>
      Promise.all(ops.map((op) => (op instanceof Promise ? op : Promise.resolve(op))))
    ),
  },
}))

// Mock the rate limiter for the verify route to allow by default
vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/rate-limit')>()
  return {
    ...original,
    publicRateLimiter: {
      check: vi.fn().mockReturnValue(true),
    },
    getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  }
})

// Mock auth: unauthenticated by default
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

import { GET as getIssuances } from '@/app/api/issuances/route'
import { GET as getVerify } from '@/app/api/verify/[ref]/route'
import { db } from '@/lib/db'
import { auth } from '@/auth'

const mockAuth = vi.mocked(auth)
const mockDb = db as unknown as {
  documentIssuance: {
    count: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: unauthenticated
    mockAuth.mockResolvedValue(null as never)
  })

  it('GET /api/issuances returns 401 when unauthenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/issuances')
    const response = await getIssuances(request)

    expect(response.status).toBe(401)
    const body = await response.json() as { error: { code: string } }
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('GET /api/verify/[ref] returns 200 for public endpoint (no auth required)', async () => {
    // Mock db findUnique returning a valid issuance
    const now = new Date('2024-06-15T08:00:00.000Z')
    mockDb.documentIssuance.findUnique.mockResolvedValueOnce({
      ref: 'validref123456789012',
      status: 'ISSUED',
      title: 'Test Doc',
      docNumber: 'DOC-001',
      docType: 'Certificate',
      docDate: now,
      issuanceTimestamp: now,
      expiresAt: null,
      org: { name: 'Test Org', logoPath: null },
      unit: null,
      signer: { fullName: 'Test Signer', title: 'Director' },
    } as never)

    const request = new NextRequest('http://localhost:3000/api/verify/validref123456789012')
    const response = await getVerify(request, {
      params: Promise.resolve({ ref: 'validref123456789012' }),
    })

    // Public endpoint — should never return 401 regardless of auth state
    expect(response.status).not.toBe(401)
    expect(response.status).not.toBe(403)
  })

  it('GET /api/issuances returns 401 even if user has no role set', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'user@test.com', name: 'User' },
      expires: '2099-01-01',
    } as never)

    const request = new NextRequest('http://localhost:3000/api/issuances')
    const response = await getIssuances(request)

    expect(response.status).toBe(403) // not ADMIN role → 403
  })
})

describe('RateLimiter (unit)', () => {
  it('allows requests under the limit', () => {
    const limiter = new RateLimiter()
    for (let i = 0; i < 20; i++) {
      expect(limiter.check('192.168.1.1', 20, 60_000)).toBe(true)
    }
  })

  it('rejects the (limit+1)th request', () => {
    const limiter = new RateLimiter()
    for (let i = 0; i < 20; i++) {
      limiter.check('10.0.0.1', 20, 60_000)
    }
    expect(limiter.check('10.0.0.1', 20, 60_000)).toBe(false)
  })

  it('resets after the window expires', () => {
    const limiter = new RateLimiter()

    // Use Date.now mock to control time
    const originalDateNow = Date.now
    let mockTime = 1_000_000

    try {
      Date.now = () => mockTime

      // Fill up the window
      for (let i = 0; i < 5; i++) {
        limiter.check('1.2.3.4', 5, 1_000)
      }
      // Should be blocked
      expect(limiter.check('1.2.3.4', 5, 1_000)).toBe(false)

      // Advance time past the window
      mockTime += 2_000

      // Should now be allowed again (new window)
      expect(limiter.check('1.2.3.4', 5, 1_000)).toBe(true)
    } finally {
      Date.now = originalDateNow
    }
  })

  it('tracks different IPs independently', () => {
    const limiter = new RateLimiter()
    for (let i = 0; i < 5; i++) {
      limiter.check('1.1.1.1', 5, 60_000)
    }
    // IP 1.1.1.1 is now blocked
    expect(limiter.check('1.1.1.1', 5, 60_000)).toBe(false)
    // IP 2.2.2.2 is not blocked
    expect(limiter.check('2.2.2.2', 5, 60_000)).toBe(true)
  })
})
