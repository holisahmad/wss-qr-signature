'use client'

import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1e3a5f] text-white hover:bg-[#2d5a8e] focus-visible:ring-[#2563eb]',
  secondary:
    'border border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f8f9fa] focus-visible:ring-[#2563eb]',
  danger:
    'bg-[#dc2626] text-white hover:bg-red-700 focus-visible:ring-[#dc2626]',
  ghost:
    'bg-transparent text-[#111827] hover:bg-[#f8f9fa] focus-visible:ring-[#2563eb]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[13px] gap-1.5',
  md: 'px-4 py-2 text-[14px] gap-2',
  lg: 'px-5 py-2.5 text-[15px] gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center rounded font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && (
        <Loader2
          className="animate-spin shrink-0"
          style={{ width: size === 'sm' ? 14 : 16, height: size === 'sm' ? 14 : 16 }}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
