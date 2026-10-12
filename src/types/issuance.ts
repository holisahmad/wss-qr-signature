import type { DocumentStatus, AssetType } from '@/generated/prisma/enums'

/** Issuance record with all related data loaded — used for generation and display */
export interface IssuanceWithRelations {
  id: string
  ref: string
  orgId: string
  unitId: string | null
  signerId: string
  title: string
  docNumber: string
  docType: string
  description: string | null
  docDate: Date
  issuanceTimestamp: Date
  expiresAt: Date | null
  status: DocumentStatus
  adminNotes: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
  org: {
    id: string
    name: string
    slug: string
    logoPath: string | null
    address: string | null
    website: string | null
    createdAt: Date
    updatedAt: Date
  }
  unit: {
    id: string
    orgId: string
    name: string
    code: string | null
    createdAt: Date
  } | null
  signer: {
    id: string
    orgId: string
    fullName: string
    title: string
    employeeId: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  createdBy: {
    id: string
    email: string
    name: string
  }
  assets: {
    id: string
    issuanceId: string
    type: AssetType
    filePath: string
    fileSize: number
    mimeType: string
    createdAt: Date
  }[]
  statusHistory: {
    id: string
    issuanceId: string
    fromStatus: DocumentStatus
    toStatus: DocumentStatus
    reason: string | null
    actorId: string | null
    createdAt: Date
  }[]
}

/** Prisma include object for loading IssuanceWithRelations */
export const issuanceWithRelationsInclude = {
  org: true,
  unit: true,
  signer: true,
  createdBy: {
    select: { id: true, email: true, name: true },
  },
  assets: true,
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
  },
} as const
