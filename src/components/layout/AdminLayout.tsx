'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/issuances', label: 'Issuances', icon: FileText, exact: false },
  { href: '/admin/issuances/new', label: 'New Issuance', icon: PlusCircle, exact: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, exact: false },
]

interface AdminLayoutProps {
  children: React.ReactNode
  userEmail?: string
  userName?: string
}

export function AdminLayout({ children, userEmail, userName }: AdminLayoutProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const sidebar = (
    <nav className="flex flex-col h-full" aria-label="Admin navigation">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-[--color-border]">
        <Link
          href="/admin"
          className="block text-[15px] font-semibold text-[--color-brand] leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] rounded"
          onClick={() => setMobileOpen(false)}
        >
          WSS QR Signature
          <span className="block text-[11px] font-normal text-[--color-text-secondary] mt-0.5">
            Document Issuance System
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <ul className="flex-1 py-2 space-y-0.5 px-2" role="list">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
                className={[
                  'flex items-center gap-2.5 px-3 py-2 rounded text-[14px] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
                  active
                    ? 'bg-[--color-background] text-[--color-brand] font-medium border-l-2 border-[--color-brand] pl-[10px]'
                    : 'text-[--color-text-secondary] hover:bg-[--color-background] hover:text-[--color-text-primary]',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Icon
                  style={{ width: 16, height: 16 }}
                  aria-hidden="true"
                  className="shrink-0"
                />
                {label}
                {active && (
                  <ChevronRight
                    style={{ width: 14, height: 14 }}
                    aria-hidden="true"
                    className="ml-auto text-[--color-brand]"
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* User section */}
      <div className="px-2 py-2 border-t border-[--color-border]">
        {(userEmail || userName) && (
          <div className="px-3 py-1.5 mb-1">
            <p className="text-[13px] font-medium text-[--color-text-primary] truncate">
              {userName ?? userEmail}
            </p>
            {userName && (
              <p className="text-[11px] text-[--color-text-secondary] truncate">{userEmail}</p>
            )}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/sign-in' })}
          className="flex w-full items-center gap-2 px-3 py-2 rounded text-[14px] text-[--color-text-secondary] hover:bg-[--color-background] hover:text-[--color-danger] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        >
          <LogOut style={{ width: 15, height: 15 }} aria-hidden="true" className="shrink-0" />
          Sign Out
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-[--color-background]">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 border-r border-[--color-border] bg-[--color-surface] sticky top-0 h-screen"
        aria-label="Sidebar"
      >
        {sidebar}
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-[--color-surface] border-r border-[--color-border] z-10">
            <div className="absolute right-3 top-3">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="p-1 rounded text-[--color-text-secondary] hover:bg-[--color-background] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
              >
                <X style={{ width: 18, height: 18 }} aria-hidden="true" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[--color-border] bg-[--color-surface] sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="p-1.5 rounded text-[--color-text-secondary] hover:bg-[--color-background] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
          >
            <Menu style={{ width: 20, height: 20 }} aria-hidden="true" />
          </button>
          <span className="text-[14px] font-semibold text-[--color-brand]">WSS QR Signature</span>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
