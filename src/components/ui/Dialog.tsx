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
  // Keep a stable ref to onClose so useEffect dependency doesn't change on every parent render
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Focus trap + Escape key — runs ONLY when isOpen changes, not on every render
  useEffect(() => {
    if (!isOpen) return

    const previousFocus = document.activeElement as HTMLElement | null

    // Focus first input/select/textarea, skip the close button
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([aria-label="Close dialog"]), [href], [tabindex]:not([tabindex="-1"])'
      ) ?? []
    )
    const firstInput = focusable.find((el) =>
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
    )
    ;(firstInput ?? focusable[0])?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]) // ← intentionally omit onClose; we use onCloseRef instead

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
          'relative z-10 w-full bg-[#ffffff] rounded border border-[#e5e7eb] shadow-lg',
          maxWidth,
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
          <h2 id={titleId} className="text-[15px] font-semibold text-[#111827]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded text-[#6b7280] hover:bg-[#f8f9fa] hover:text-[#111827] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
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
