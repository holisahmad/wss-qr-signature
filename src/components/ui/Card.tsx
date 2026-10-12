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
        'bg-[--color-surface] border border-[--color-border] rounded',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title && (
        <div className="px-4 py-3 border-b border-[--color-border]">
          <h2 className="text-[14px] font-semibold text-[--color-text-primary]">{title}</h2>
        </div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-[--color-border] bg-[--color-background] rounded-b">
          {footer}
        </div>
      )}
    </div>
  )
}
