import { z } from 'zod'

export const CreateIssuanceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  docNumber: z.string().min(1, 'Document number is required').max(100),
  docType: z.string().min(1, 'Document type is required').max(100),
  description: z.string().max(2000).optional().nullable(),
  orgId: z.string().min(1, 'Organization is required'),
  unitId: z.string().optional().nullable(),
  signerId: z.string().min(1, 'Signer is required'),
  docDate: z.string().datetime({ offset: true }).or(z.string().date()),
  issuanceTimestamp: z.string().datetime({ offset: true }).or(z.string().date()),
  expiresAt: z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
})

export type CreateIssuanceInput = z.infer<typeof CreateIssuanceSchema>

export const UpdateIssuanceSchema = z
  .object({
    title: z.string().min(1).max(255),
    docNumber: z.string().min(1).max(100),
    docType: z.string().min(1).max(100),
    description: z.string().max(2000).nullable(),
    unitId: z.string().nullable(),
    signerId: z.string().min(1),
    docDate: z.string().datetime({ offset: true }).or(z.string().date()),
    issuanceTimestamp: z.string().datetime({ offset: true }).or(z.string().date()),
    expiresAt: z.string().datetime({ offset: true }).or(z.string().date()).nullable(),
    adminNotes: z.string().max(2000).nullable(),
  })
  .partial()

export type UpdateIssuanceInput = z.infer<typeof UpdateIssuanceSchema>

export const RevokeIssuanceSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

export type RevokeIssuanceInput = z.infer<typeof RevokeIssuanceSchema>
