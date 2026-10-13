'use client'

import type { SelectHTMLAttributes } from 'react'
import { useId } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
}

export function Select({
  label,
  options,
  placeholder,
  error,
  helperText,
  required,
  id: idProp,
  className = '',
  ...props
}: SelectProps) {
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
      <select
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
          'h-9 w-full rounded border bg-[#ffffff] px-3 text-[14px] text-[#111827]',
          'transition-colors appearance-none',
          'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")] bg-no-repeat bg-[right_10px_center]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-0',
          error
            ? 'border-[#dc2626] focus-visible:ring-[#dc2626]'
            : 'border-[#e5e7eb]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
