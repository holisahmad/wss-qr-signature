'use client'

import { useEffect, useState } from 'react'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

interface AuditEventRow {
  id: string
  action: string
  entityType: string
  entityId: string
  createdAt: string
  meta: string | null
  actor: {
    id: string
    email: string
    name: string | null
  } | null
}

interface AuditApiResponse {
  data: {
    data: AuditEventRow[]
    total: number
    page: number
    limit: number
  }
}

const fmt = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatMeta(metaStr: string | null): string {
  if (!metaStr) return '—'
  try {
    const obj = JSON.parse(metaStr) as Record<string, unknown>
    const keys = Object.keys(obj)
    if (keys.length === 0) return '—'
    const pairs = keys
      .slice(0, 2)
      .map((k) => `${k}=${String(obj[k])}`)
      .join(', ')
    return keys.length > 2 ? `${pairs}, …` : pairs
  } catch {
    return metaStr.slice(0, 40)
  }
}

const COLUMNS: ColumnDef<AuditEventRow>[] = [
  {
    header: 'Timestamp',
    accessor: (row) => (
      <span className="whitespace-nowrap text-[13px]">
        {fmt.format(new Date(row.createdAt))}
      </span>
    ),
    className: 'w-[160px]',
  },
  {
    header: 'Actor',
    accessor: (row) => (
      <span className="text-[13px]">
        {row.actor?.name ?? row.actor?.email ?? 'System'}
      </span>
    ),
  },
  {
    header: 'Action',
    accessor: (row) => (
      <span className="font-mono text-[12px] bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#1e3a5f]">
        {row.action}
      </span>
    ),
  },
  {
    header: 'Entity',
    accessor: (row) => {
      const entity = `${row.entityType} ${row.entityId}`
      return (
        <span className="text-[13px] text-[#6b7280]" title={entity}>
          {entity.length > 20 ? `${entity.slice(0, 20)}…` : entity}
        </span>
      )
    },
  },
  {
    header: 'Details',
    accessor: (row) => (
      <span className="text-[12px] text-[#6b7280]">{formatMeta(row.meta)}</span>
    ),
  },
]

const PAGE_SIZE = 50

export function AuditLogClient() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<AuditEventRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)
  const { showToast, ToastContainer } = useToast()

  // Data fetch effect — setState is called only from the async callbacks (not synchronously in body)
  useEffect(() => {
    const controller = new AbortController()

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    if (action) params.set('action', action)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    fetch(`/api/admin/audit?${params.toString()}`, { signal: controller.signal })
      .then((res): Promise<AuditApiResponse> => {
        if (!res.ok) throw new Error('fetch failed')
        return res.json() as Promise<AuditApiResponse>
      })
      .then((json) => {
        setData(json.data.data)
        setTotal(json.data.total)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        showToast('Failed to load audit log', 'error')
        setIsLoading(false)
      })

    return () => { controller.abort() }
  }, [page, action, dateFrom, dateTo, fetchKey, showToast])

  function triggerRefetch() {
    setIsLoading(true)
    setFetchKey((k) => k + 1)
  }

  function handleReset() {
    setAction('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  async function handleCleanup() {
    setCleanupLoading(true)
    try {
      const res = await fetch('/api/admin/audit/cleanup', { method: 'POST' })
      if (!res.ok) {
        showToast('Cleanup failed', 'error')
        return
      }
      const json = (await res.json()) as { data: { deletedCount: number } }
      const count = json.data.deletedCount
      showToast(
        count === 0
          ? 'No old records to delete (all within 60 days)'
          : `Cleanup complete — ${count} old record${count === 1 ? '' : 's'} deleted`,
        'success'
      )
      triggerRefetch()
    } catch {
      showToast('Error running cleanup', 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  function handleActionChange(val: string) {
    setAction(val)
    setPage(1)
  }

  function handleDateFromChange(val: string) {
    setDateFrom(val)
    setPage(1)
  }

  function handleDateToChange(val: string) {
    setDateTo(val)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastContainer />

      {/* Filters */}
      <div className="bg-[#ffffff] rounded border border-[#e5e7eb] px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
            <Input
              label="Filter by action"
              type="text"
              placeholder="e.g. LOGIN"
              value={action}
              onChange={(e) => handleActionChange(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Input
              label="From"
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Input
              label="To"
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={handleReset} size="sm" type="button">
            Reset
          </Button>
        </div>
      </div>

      {/* Table header row with cleanup button */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#6b7280]">
          {isLoading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'} found`}
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={cleanupLoading}
          onClick={() => void handleCleanup()}
          type="button"
        >
          Run Cleanup
        </Button>
      </div>

      <DataTable<AuditEventRow>
        columns={COLUMNS}
        data={data}
        totalCount={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No audit events found for the selected filters."
        getRowKey={(row) => row.id}
      />
    </div>
  )
}
