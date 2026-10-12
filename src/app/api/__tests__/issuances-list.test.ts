import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    documentIssuance: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(),
  },
}))

// Mock auth — authenticated admin
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'user-admin-001', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
    expires: '2099-01-01',
  }),
}))

import { GET } from '@/app/api/issuances/route'
import { db } from '@/lib/db'

const mockDb = db as unknown as {
  documentIssuance: {
    count: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

/** Helper: captures the args passed to $transaction and asserts on them */
function captureTransactionArgs() {
  const capturedArgs: unknown[] = []
  mockDb.$transaction.mockImplementationOnce((ops: unknown[]) => {
    capturedArgs.push(...ops)
    // Return [0, []] — count=0, items=[]
    return Promise.resolve([0, []])
  })
  return capturedArgs
}

describe('GET /api/issuances (list)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return [0, []] from $transaction
    mockDb.$transaction.mockResolvedValue([0, []])
  })

  it('returns 200 with pagination wrapper', async () => {
    const request = new NextRequest('http://localhost:3000/api/issuances')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json() as { data: { total: number; page: number; limit: number } }
    expect(body.data).toHaveProperty('total')
    expect(body.data).toHaveProperty('page')
    expect(body.data).toHaveProperty('limit')
  })

  it('passes search term as OR clause to Prisma', async () => {
    let calledWith: unknown = null

    mockDb.$transaction.mockImplementationOnce(
      async (ops: [ReturnType<typeof db.documentIssuance.count>, ReturnType<typeof db.documentIssuance.findMany>]) => {
        calledWith = ops
        return [0, []]
      }
    )

    const request = new NextRequest('http://localhost:3000/api/issuances?search=TestDoc')
    await GET(request)

    // Prisma $transaction receives an array of promises; we can inspect the call args on the mocked methods
    // Instead we verify the where clause via the count call args
    expect(mockDb.documentIssuance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: expect.objectContaining({ contains: 'TestDoc' }) }),
          ]),
        }),
      })
    )
  })

  it('passes status filter to Prisma where clause', async () => {
    mockDb.$transaction.mockResolvedValue([0, []])

    const request = new NextRequest('http://localhost:3000/api/issuances?status=ISSUED')
    await GET(request)

    expect(mockDb.documentIssuance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ISSUED' }),
      })
    )
  })

  it('calculates correct skip/take for page 2, limit 10', async () => {
    mockDb.$transaction.mockResolvedValue([0, []])

    const request = new NextRequest('http://localhost:3000/api/issuances?page=2&limit=10')
    await GET(request)

    expect(mockDb.documentIssuance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (page-1) * limit = (2-1) * 10 = 10
        take: 10,
      })
    )
  })

  it('orders by createdAt asc when sort=oldest', async () => {
    mockDb.$transaction.mockResolvedValue([0, []])

    const request = new NextRequest('http://localhost:3000/api/issuances?sort=oldest')
    await GET(request)

    expect(mockDb.documentIssuance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    )
  })

  it('orders by createdAt desc by default', async () => {
    mockDb.$transaction.mockResolvedValue([0, []])

    const request = new NextRequest('http://localhost:3000/api/issuances')
    await GET(request)

    expect(mockDb.documentIssuance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('builds correct date range filter', async () => {
    mockDb.$transaction.mockResolvedValue([0, []])

    const request = new NextRequest(
      'http://localhost:3000/api/issuances?dateFrom=2024-01-01&dateTo=2024-12-31'
    )
    await GET(request)

    expect(mockDb.documentIssuance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    )
  })
})
