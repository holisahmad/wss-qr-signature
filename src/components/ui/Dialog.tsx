'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}: DialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return

    const previousFocus = document.activeElement as HTMLElement | null

    // Focus first focusable element in dialog
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusableEls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusableEls || focusableEls.length === 0) return

      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative z-10 w-full bg-[--color-surface] rounded border border-[--color-border] shadow-lg',
          maxWidth,
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--color-border]">
          <h2 id={titleId} className="text-[15px] font-semibold text-[--color-text-primary]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded text-[--color-text-secondary] hover:bg-[--color-background] hover:text-[--color-text-primary] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
          >
            <X style={{ width: 16, height: 16 }} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
