import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Card({ title, children, footer, className = '' }: CardProps) {
  return (
    <div
      className={[
        'bg-[#ffffff] border border-[#e5e7eb] rounded',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title && (
        <div className="px-4 py-3 border-b border-[#e5e7eb]">
          <h2 className="text-[14px] font-semibold text-[#111827]">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-[#e5e7eb] bg-[#f8f9fa] rounded-b">
          {footer}
        </div>
      )}
    </div>
  )
}
