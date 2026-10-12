import { describe, it, expect } from 'vitest'
import { canTransition, assertTransition } from '../issuance-state-machine'

describe('issuance-state-machine', () => {
  describe('canTransition', () => {
    it('allows DRAFT → ISSUED', () => {
      expect(canTransition('DRAFT', 'ISSUED')).toBe(true)
    })

    it('does NOT allow DRAFT → REVOKED', () => {
      expect(canTransition('DRAFT', 'REVOKED')).toBe(false)
    })

    it('allows ISSUED → REVOKED', () => {
      expect(canTransition('ISSUED', 'REVOKED')).toBe(true)
    })

    it('allows ISSUED → EXPIRED', () => {
      expect(canTransition('ISSUED', 'EXPIRED')).toBe(true)
    })

    it('does NOT allow REVOKED → any transition', () => {
      expect(canTransition('REVOKED', 'DRAFT')).toBe(false)
      expect(canTransition('REVOKED', 'ISSUED')).toBe(false)
      expect(canTransition('REVOKED', 'EXPIRED')).toBe(false)
    })

    it('does NOT allow EXPIRED → any transition', () => {
      expect(canTransition('EXPIRED', 'DRAFT')).toBe(false)
      expect(canTransition('EXPIRED', 'ISSUED')).toBe(false)
      expect(canTransition('EXPIRED', 'REVOKED')).toBe(false)
    })

    it('does NOT allow DRAFT → EXPIRED', () => {
      expect(canTransition('DRAFT', 'EXPIRED')).toBe(false)
    })

    it('does NOT allow ISSUED → DRAFT', () => {
      expect(canTransition('ISSUED', 'DRAFT')).toBe(false)
    })
  })

  describe('assertTransition', () => {
    it('does not throw for valid transition', () => {
      expect(() => assertTransition('DRAFT', 'ISSUED')).not.toThrow()
    })

    it('throws for invalid transition', () => {
      expect(() => assertTransition('DRAFT', 'REVOKED')).toThrow()
    })

    it('throws with descriptive message', () => {
      expect(() => assertTransition('REVOKED', 'ISSUED')).toThrow(/Invalid status transition/)
    })

    it('throws for REVOKED → anything', () => {
      expect(() => assertTransition('REVOKED', 'DRAFT')).toThrow()
      expect(() => assertTransition('REVOKED', 'EXPIRED')).toThrow()
    })
  })
})
