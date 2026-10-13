import { z } from 'zod'

export const CreateSignerSchema = z.object({
  orgId: z.string().min(1, 'Organization is required'),
  fullName: z.string().min(1, 'Full name is required').max(200),
  title: z.string().min(1, 'Title is required').max(200),
  employeeId: z.string().max(100).optional().nullable(),
  isActive: z.boolean().default(true),
})

export type CreateSignerInput = z.infer<typeof CreateSignerSchema>

export const UpdateSignerSchema = CreateSignerSchema.omit({ orgId: true }).partial()

export type UpdateSignerInput = z.infer<typeof UpdateSignerSchema>
