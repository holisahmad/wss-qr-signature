'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface Org { id: string; name: string }

interface IssuanceFiltersProps {
  orgs: Org[]
  currentSearch: string
  currentStatus: string
  currentOrgId: string
  currentDateFrom: string
  currentDateTo: string
  currentSort: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: '○ Draft' },
  { value: 'ISSUED', label: '✓ Issued' },
  { value: 'REVOKED', label: '✗ Revoked' },
  { value: 'EXPIRED', label: '⚠ Expired' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'docNumber', label: 'Doc number' },
]

export function IssuanceFilters({
  orgs,
  currentSearch,
  currentStatus,
  currentOrgId,
  currentDateFrom,
  currentDateTo,
  currentSort,
}: IssuanceFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page') // reset to page 1 on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  function clearAll() {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasFilters =
    currentSearch || currentStatus || currentOrgId || currentDateFrom || currentDateTo

  return (
    <div
      className={['flex flex-wrap items-end gap-3', isPending ? 'opacity-60 pointer-events-none' : ''].join(' ')}
      aria-label="Issuance filters"
    >
      {/* Search */}
      <div className="flex flex-col gap-1 min-w-[180px]">
        <label htmlFor="filter-search" className="text-[12px] font-medium text-[--color-text-secondary]">
          Search
        </label>
        <input
          id="filter-search"
          type="search"
          defaultValue={currentSearch}
          placeholder="Title, doc number, ref..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParam('search', (e.target as HTMLInputElement).value)
            }
          }}
          onBlur={(e) => updateParam('search', e.target.value)}
          className="h-8 rounded border border-[--color-border] bg-[--color-surface] px-3 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-status" className="text-[12px] font-medium text-[--color-text-secondary]">
          Status
        </label>
        <select
          id="filter-status"
          value={currentStatus}
          onChange={(e) => updateParam('status', e.target.value)}
          className="h-8 rounded border border-[--color-border] bg-[--color-surface] px-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Organization */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-org" className="text-[12px] font-medium text-[--color-text-secondary]">
          Organization
        </label>
        <select
          id="filter-org"
          value={currentOrgId}
          onChange={(e) => updateParam('orgId', e.target.value)}
          className="h-8 rounded border border-[--color-border] bg-[--color-surface] px-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        >
          <option value="">All Organizations</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>

      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-from" className="text-[12px] font-medium text-[--color-text-secondary]">
          From
        </label>
        <input
          id="filter-from"
          type="date"
          value={currentDateFrom}
          onChange={(e) => updateParam('dateFrom', e.target.value)}
          className="h-8 rounded border border-[--color-border] bg-[--color-surface] px-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-to" className="text-[12px] font-medium text-[--color-text-secondary]">
          To
        </label>
        <input
          id="filter-to"
          type="date"
          value={currentDateTo}
          onChange={(e) => updateParam('dateTo', e.target.value)}
          className="h-8 rounded border border-[--color-border] bg-[--color-surface] px-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        />
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-sort" className="text-[12px] font-medium text-[--color-text-secondary]">
          Sort
        </label>
        <select
          id="filter-sort"
          value={currentSort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="h-8 rounded border border-[--color-border] bg-[--color-surface] px-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="h-8 px-3 text-[13px] text-[--color-text-secondary] hover:text-[--color-text-primary] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] rounded"
        >
          Clear filters
        </button>
      )}

      {isPending && (
        <p className="text-[12px] text-[--color-text-secondary]" role="status" aria-live="polite">
          Loading…
        </p>
      )}
    </div>
  )
}
