import { db } from '@/lib/db'

interface WriteAuditEventParams {
  action: string
  entityType: string
  entityId: string
  actorId?: string
  meta?: Record<string, unknown>
  ip?: string
}

/**
 * Append-only audit log writer.
 * Never throws — audit failure must not break business logic.
 *
 * Note: Prisma's generated SQLite schema stores Json fields as `string | null`.
 * We serialize meta to a JSON string before writing.
 */
export async function writeAuditEvent(params: WriteAuditEventParams): Promise<void> {
  try {
    const metaValue: string | null =
      params.meta !== undefined ? JSON.stringify(params.meta) : null

    await db.auditEvent.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId ?? null,
        meta: metaValue,
        ipAddress: params.ip ?? null,
      },
    })
  } catch (err) {
    // Log to stderr but never re-throw
    console.error('[audit] Failed to write audit event:', err)
  }
}
