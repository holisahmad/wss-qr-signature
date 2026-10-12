import type { DocumentStatus } from '@/generated/prisma/enums'

/** All valid status transitions */
const VALID_TRANSITIONS: ReadonlySet<string> = new Set([
  'DRAFT->ISSUED',
  'ISSUED->REVOKED',
  'ISSUED->EXPIRED',
  'DRAFT->PENDING', // alias kept for spec compatibility (PENDING not in schema, maps to ISSUED flow)
])

function transitionKey(from: DocumentStatus, to: DocumentStatus): string {
  return `${from}->${to}`
}

/**
 * Returns true if the transition from → to is permitted.
 */
export function canTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_TRANSITIONS.has(transitionKey(from, to))
}

/**
 * Throws an Error if the transition is not permitted.
 * Safe to call inside API handlers — catch and convert to 409.
 */
export function assertTransition(from: DocumentStatus, to: DocumentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} → ${to}. ` +
        `Allowed transitions from ${from}: ${getAllowedTransitions(from).join(', ') || 'none'}`
    )
  }
}

function getAllowedTransitions(from: DocumentStatus): string[] {
  const allowed: string[] = []
  for (const key of VALID_TRANSITIONS) {
    if (key.startsWith(`${from}->`)) {
      allowed.push(key.split('->')[1])
    }
  }
  return allowed
}
