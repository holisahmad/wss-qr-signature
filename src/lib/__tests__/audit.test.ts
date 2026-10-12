import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db before importing audit
vi.mock('@/lib/db', () => ({
  db: {
    auditEvent: {
      create: vi.fn(),
    },
  },
}))

import { writeAuditEvent } from '../audit'
import { db } from '@/lib/db'

const mockCreate = vi.mocked(db.auditEvent.create)

describe('audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls prisma.auditEvent.create with correct data', async () => {
    mockCreate.mockResolvedValueOnce({} as never)

    await writeAuditEvent({
      action: 'TEST_ACTION',
      entityType: 'Issuance',
      entityId: 'entity-id-001',
      actorId: 'actor-id-001',
      meta: { key: 'value' },
      ip: '127.0.0.1',
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        action: 'TEST_ACTION',
        entityType: 'Issuance',
        entityId: 'entity-id-001',
        actorId: 'actor-id-001',
        meta: JSON.stringify({ key: 'value' }),
        ipAddress: '127.0.0.1',
      },
    })
  })

  it('does not throw even when prisma.auditEvent.create rejects', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'))

    // Should not throw
    await expect(
      writeAuditEvent({
        action: 'FAIL_ACTION',
        entityType: 'Issuance',
        entityId: 'entity-id-002',
      })
    ).resolves.toBeUndefined()
  })

  it('writes null meta when no meta provided', async () => {
    mockCreate.mockResolvedValueOnce({} as never)

    await writeAuditEvent({
      action: 'NO_META',
      entityType: 'Issuance',
      entityId: 'entity-id-003',
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meta: null,
        actorId: null,
        ipAddress: null,
      }),
    })
  })

  it('does not export updateAuditEvent or deleteAuditEvent', async () => {
    const auditModule = await import('../audit')
    const exports = Object.keys(auditModule)

    expect(exports).not.toContain('updateAuditEvent')
    expect(exports).not.toContain('deleteAuditEvent')
    expect(exports).toContain('writeAuditEvent')
  })
})
