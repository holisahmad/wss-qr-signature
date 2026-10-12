import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-[--color-text-primary] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-[14px] text-[--color-text-secondary]">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-3 border-b border-[--color-border]" />
    </div>
  )
}
