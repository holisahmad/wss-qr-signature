import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    documentIssuance: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    generatedAsset: {
      createMany: vi.fn(),
    },
    issuanceStatusHistory: {
      create: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock auth — provide an authenticated admin session by default
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'user-admin-001', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
    expires: '2099-01-01',
  }),
}))

// Mock QR and signature generators to avoid heavy canvas work in integration tests
vi.mock('@/lib/qr-generator', () => ({
  generateQR: vi.fn().mockResolvedValue(Buffer.alloc(500, 0)),
}))

vi.mock('@/lib/signature-block-generator', () => ({
  generateSignatureBlock: vi.fn().mockResolvedValue(Buffer.alloc(500, 0)),
}))

// Mock fs to avoid real disk writes
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  }
})

import { POST as postIssuances } from '@/app/api/issuances/route'
import { POST as postIssue } from '@/app/api/issuances/[id]/issue/route'
import { POST as postRevoke } from '@/app/api/issuances/[id]/revoke/route'
import { db } from '@/lib/db'
import { auth } from '@/auth'

const mockAuth = vi.mocked(auth)
const mockDb = db as unknown as {
  documentIssuance: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  auditEvent: { create: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const now = new Date('2024-06-15T08:00:00.000Z')

function buildDbIssuance(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cuid-issuance-001',
    ref: 'ABC123def456ghi7890ab',
    orgId: 'cuid-org-001',
    unitId: null,
    signerId: 'cuid-signer-001',
    title: 'Test Certificate',
    docNumber: 'CERT/TEST/2024/001',
    docType: 'Certificate',
    description: null,
    docDate: now,
    issuanceTimestamp: now,
    expiresAt: null,
    status: 'DRAFT',
    adminNotes: null,
    createdById: 'user-admin-001',
    createdAt: now,
    updatedAt: now,
    org: {
      id: 'cuid-org-001',
      name: 'Test Org',
      slug: 'test-org',
      logoPath: null,
      address: null,
      website: null,
      createdAt: now,
      updatedAt: now,
    },
    unit: null,
    signer: {
      id: 'cuid-signer-001',
      orgId: 'cuid-org-001',
      fullName: 'Test Signer',
      title: 'Director',
      employeeId: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    createdBy: { id: 'user-admin-001', email: 'admin@test.com', name: 'Admin' },
    assets: [],
    statusHistory: [],
    ...overrides,
  }
}

function makeRequest(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/issuances', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({
      user: { id: 'user-admin-001', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
      expires: '2099-01-01',
    } as never)
  })

  it('creates an issuance (201) when authenticated with valid payload', async () => {
    mockDb.documentIssuance.findFirst.mockResolvedValueOnce(null) // no duplicate
    mockDb.documentIssuance.create.mockResolvedValueOnce(
      buildDbIssuance({ status: 'DRAFT' })
    )
    mockDb.auditEvent.create.mockResolvedValueOnce({})

    const payload = {
      title: 'Test Certificate',
      docNumber: 'CERT/TEST/2024/001',
      docType: 'Certificate',
      orgId: 'cuid-org-001',
      signerId: 'cuid-signer-001',
      docDate: '2024-06-01',
      issuanceTimestamp: '2024-06-15',
    }

    const response = await postIssuances(makeRequest('http://localhost:3000/api/issuances', payload))

    expect(response.status).toBe(201)
    const body = await response.json() as { data: { ref: string } }
    expect(body.data.ref).toBeDefined()
  })

  it('returns 422 when title is missing', async () => {
    const payload = {
      docNumber: 'CERT/TEST/2024/001',
      docType: 'Certificate',
      orgId: 'cuid-org-001',
      signerId: 'cuid-signer-001',
      docDate: '2024-06-01',
      issuanceTimestamp: '2024-06-15',
    }

    const response = await postIssuances(makeRequest('http://localhost:3000/api/issuances', payload))

    expect(response.status).toBe(422)
    const body = await response.json() as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never)

    const payload = {
      title: 'Test',
      docNumber: 'DOC-001',
      docType: 'Certificate',
      orgId: 'org-1',
      signerId: 'signer-1',
      docDate: '2024-06-01',
      issuanceTimestamp: '2024-06-15',
    }

    const response = await postIssuances(makeRequest('http://localhost:3000/api/issuances', payload))

    expect(response.status).toBe(401)
  })
})

describe('POST /api/issuances/[id]/issue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({
      user: { id: 'user-admin-001', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
      expires: '2099-01-01',
    } as never)
  })

  it('transitions DRAFT → ISSUED and returns 200', async () => {
    const draftIssuance = buildDbIssuance({ status: 'DRAFT' })
    const issuedIssuance = buildDbIssuance({ status: 'ISSUED' })

    mockDb.documentIssuance.findUnique.mockResolvedValueOnce(draftIssuance)
    mockDb.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        generatedAsset: { createMany: vi.fn().mockResolvedValue({}) },
        issuanceStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        documentIssuance: { update: vi.fn().mockResolvedValue(issuedIssuance) },
      }
      return fn(fakeTx)
    })
    mockDb.auditEvent.create.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/issuances/cuid-issuance-001/issue', {
      method: 'POST',
    })

    const response = await postIssue(request, {
      params: Promise.resolve({ id: 'cuid-issuance-001' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json() as { data: { status: string } }
    expect(body.data.status).toBe('ISSUED')
  })

  it('returns 409 when issuance is already ISSUED', async () => {
    const issuedIssuance = buildDbIssuance({ status: 'ISSUED' })
    mockDb.documentIssuance.findUnique.mockResolvedValueOnce(issuedIssuance)

    const request = new NextRequest('http://localhost:3000/api/issuances/cuid-issuance-001/issue', {
      method: 'POST',
    })

    const response = await postIssue(request, {
      params: Promise.resolve({ id: 'cuid-issuance-001' }),
    })

    expect(response.status).toBe(409)
  })
})

describe('POST /api/issuances/[id]/revoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({
      user: { id: 'user-admin-001', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' },
      expires: '2099-01-01',
    } as never)
  })

  it('transitions ISSUED → REVOKED with valid reason (200)', async () => {
    const issuedIssuance = { id: 'cuid-issuance-001', status: 'ISSUED', ref: 'ABC123' }
    const revokedIssuance = buildDbIssuance({ status: 'REVOKED' })

    mockDb.documentIssuance.findUnique.mockResolvedValueOnce(issuedIssuance)
    mockDb.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        issuanceStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        documentIssuance: { update: vi.fn().mockResolvedValue(revokedIssuance) },
      }
      return fn(fakeTx)
    })
    mockDb.auditEvent.create.mockResolvedValueOnce({})

    const request = new NextRequest(
      'http://localhost:3000/api/issuances/cuid-issuance-001/revoke',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Valid revocation reason here.' }),
      }
    )

    const response = await postRevoke(request, {
      params: Promise.resolve({ id: 'cuid-issuance-001' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json() as { data: { status: string } }
    expect(body.data.status).toBe('REVOKED')
  })

  it('returns 422 when reason is too short (< 10 chars)', async () => {
    const issuedIssuance = { id: 'cuid-issuance-001', status: 'ISSUED', ref: 'ABC123' }
    mockDb.documentIssuance.findUnique.mockResolvedValueOnce(issuedIssuance)

    const request = new NextRequest(
      'http://localhost:3000/api/issuances/cuid-issuance-001/revoke',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'short' }),
      }
    )

    const response = await postRevoke(request, {
      params: Promise.resolve({ id: 'cuid-issuance-001' }),
    })

    expect(response.status).toBe(422)
  })
})
