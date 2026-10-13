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
      <label htmlFor={id} className="text-[13px] font-medium text-[#111827]">
        {label}
        {required && (
          <span className="text-[#dc2626] ml-0.5" aria-hidden="true">
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
          'w-full rounded border bg-[#ffffff] px-3 py-2 text-[14px] text-[#111827]',
          'placeholder:text-[#9ca3af] transition-colors resize-y min-h-[80px]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0',
          error
            ? 'border-[#dc2626] focus-visible:ring-[#dc2626]'
            : 'border-[#e5e7eb]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {error && (
        <p id={errorId} role="alert" className="text-[12px] text-[#dc2626]">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-[12px] text-[#6b7280]">
          {helperText}
        </p>
      )}
    </div>
  )
}
