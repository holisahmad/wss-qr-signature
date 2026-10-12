'use client'

import type { TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export function Textarea({
  label,
  error,
  helperText,
  required,
  id: idProp,
  className = '',
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-[--color-text-primary]">
        {label}
        {required && (
          <span className="text-[--color-danger] ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <textarea
        {...props}
        id={id}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          [error ? errorId : null, helperText ? helperId : null].filter(Boolean).join(' ') ||
          undefined
        }
        className={[
          'w-full rounded border bg-[--color-surface] px-3 py-2 text-[14px] text-[--color-text-primary]',
          'placeholder:text-[--color-muted] transition-colors resize-y min-h-[80px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-0',
          error
            ? 'border-[--color-danger] focus-visible:ring-[--color-danger]'
            : 'border-[--color-border]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && (
        <p id={errorId} role="alert" className="text-[12px] text-[--color-danger]">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-[12px] text-[--color-text-secondary]">
          {helperText}
        </p>
      )}
    </div>
  )
}
