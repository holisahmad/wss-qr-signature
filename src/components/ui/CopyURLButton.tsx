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
      className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-[#ffffff] px-4 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:outline-none min-h-[44px]"
    >
      {copied ? (
        <>
          <Check className="size-4 text-[#15803d]" aria-hidden />
          <span className="text-[#15803d]">Copied!</span>
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
