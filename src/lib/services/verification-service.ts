import { db } from '@/lib/db'
import type { DocumentStatus } from '@/generated/prisma/enums'

/** Public-safe issuance data — no internal IDs, no emails, no adminNotes */
export interface PublicVerificationData {
  ref: string
  status: DocumentStatus
  organization: {
    name: string
    logoPath: string | null
  }
  organizationalUnit: { name: string } | null
  signer: {
    fullName: string
    title: string
  }
  document: {
    title: string
    docNumber: string
    docType: string
    docDate: Date
    issuanceTimestamp: Date
    expiresAt: Date | null
  }
}

/**
 * Query the database directly (no HTTP round-trip) and return only
 * public-safe fields.  Returns null when the ref is unknown.
 */
export async function getPublicVerification(
  ref: string,
): Promise<PublicVerificationData | null> {
  const issuance = await db.documentIssuance.findUnique({
    where: { ref },
    select: {
      ref: true,
      status: true,
      title: true,
      docNumber: true,
      docType: true,
      docDate: true,
      issuanceTimestamp: true,
      expiresAt: true,
      org: {
        select: {
          name: true,
          logoPath: true,
        },
      },
      unit: {
        select: {
          name: true,
        },
      },
      signer: {
        select: {
          fullName: true,
          title: true,
        },
      },
    },
  })

  if (!issuance) return null

  return {
    ref: issuance.ref,
    status: issuance.status,
    organization: {
      name: issuance.org.name,
      logoPath: issuance.org.logoPath,
    },
    organizationalUnit: issuance.unit ? { name: issuance.unit.name } : null,
    signer: {
      fullName: issuance.signer.fullName,
      title: issuance.signer.title,
    },
    document: {
      title: issuance.title,
      docNumber: issuance.docNumber,
      docType: issuance.docType,
      docDate: issuance.docDate,
      issuanceTimestamp: issuance.issuanceTimestamp,
      expiresAt: issuance.expiresAt,
    },
  }
}
