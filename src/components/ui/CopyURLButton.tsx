'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * Thin client island: copies window.location.href to clipboard.
 * Degrades gracefully when the Clipboard API is unavailable.
 * Shows a "Copied!" confirmation for 2 seconds.
 */
export function CopyURLButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = window.location.href
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
      // If clipboard API unavailable, button simply does nothing — no error thrown
    } catch {
      // Ignore clipboard errors silently
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'URL copied to clipboard' : 'Copy verification URL to clipboard'}
      className="inline-flex items-center gap-2 rounded-md border border-[--color-border] bg-[--color-surface] px-4 py-2 text-sm font-medium text-[--color-text-secondary] transition hover:bg-[--color-muted-bg] focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:outline-none min-h-[44px]"
    >
      {copied ? (
        <>
          <Check className="size-4 text-[--color-success]" aria-hidden />
          <span className="text-[--color-success]">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="size-4" aria-hidden />
          <span>Copy Verification URL</span>
        </>
      )}
    </button>
  )
}
