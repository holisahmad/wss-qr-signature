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
    'bg-[--color-brand] text-white hover:bg-[--color-brand-hover] focus-visible:ring-[--color-accent]',
  secondary:
    'border border-[--color-border] bg-[--color-surface] text-[--color-text-primary] hover:bg-[--color-background] focus-visible:ring-[--color-accent]',
  danger:
    'bg-[--color-danger] text-white hover:bg-red-700 focus-visible:ring-[--color-danger]',
  ghost:
    'bg-transparent text-[--color-text-primary] hover:bg-[--color-background] focus-visible:ring-[--color-accent]',
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
