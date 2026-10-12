import type { IssuanceWithRelations } from '@/types/issuance'

/** Build a realistic-but-fake IssuanceWithRelations for tests. No real people or orgs. */
export function buildMockIssuance(
  overrides: Partial<IssuanceWithRelations> = {}
): IssuanceWithRelations {
  const now = new Date('2024-06-15T08:00:00.000Z')

  return {
    id: 'cuid-issuance-001',
    ref: 'ABC123def456ghi7890ab',
    orgId: 'cuid-org-001',
    unitId: 'cuid-unit-001',
    signerId: 'cuid-signer-001',
    title: 'Certificate of Participation — Test Holder',
    docNumber: 'CERT/TEST/2024/001',
    docType: 'Certificate',
    description: 'Mock description for testing purposes.',
    docDate: new Date('2024-06-01T00:00:00.000Z'),
    issuanceTimestamp: now,
    expiresAt: null,
    status: 'ISSUED',
    adminNotes: null,
    createdById: 'cuid-user-001',
    createdAt: now,
    updatedAt: now,
    org: {
      id: 'cuid-org-001',
      name: 'Test Organization',
      slug: 'test-org',
      logoPath: null,
      address: '1 Test Street, Test City',
      website: 'https://test.example.com',
      createdAt: now,
      updatedAt: now,
    },
    unit: {
      id: 'cuid-unit-001',
      orgId: 'cuid-org-001',
      name: 'Test Unit',
      code: 'TU',
      createdAt: now,
    },
    signer: {
      id: 'cuid-signer-001',
      orgId: 'cuid-org-001',
      fullName: 'Test Signer',
      title: 'Director of Testing',
      employeeId: 'EMP-001',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    createdBy: {
      id: 'cuid-user-001',
      email: 'admin@test.example.com',
      name: 'Test Admin',
    },
    assets: [],
    statusHistory: [],
    ...overrides,
  }
}
