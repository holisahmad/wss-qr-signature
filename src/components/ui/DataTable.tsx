'use client'

import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface ColumnDef<T> {
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  sortKey?: string
  className?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSort?: (key: string, dir: 'asc' | 'desc') => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  isLoading?: boolean
  emptyMessage?: string
  getRowKey: (row: T) => string
}

export function DataTable<T>({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onSort,
  sortKey,
  sortDir,
  isLoading,
  emptyMessage = 'No results found.',
  getRowKey,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function handleSort(key: string) {
    if (!onSort) return
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    onSort(key, newDir)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded border border-[#e5e7eb]">
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={[
                    'px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide',
                    col.sortKey ? 'cursor-pointer select-none hover:text-[#111827]' : '',
                    col.className ?? '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                  aria-sort={
                    col.sortKey && sortKey === col.sortKey
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : col.sortKey
                      ? 'none'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortKey && (
                      <ArrowUpDown
                        className="text-[#9ca3af]"
                        style={{ width: 13, height: 13 }}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-[#e5e7eb]">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-[#f3f4f6] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-[#6b7280]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f8f9fa] transition-colors"
                >
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={['px-4 py-3 text-[#111827]', col.className ?? '']
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : String(row[col.accessor] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 text-[13px] text-[#6b7280]">
        <span>
          {totalCount === 0
            ? 'No results'
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="flex items-center gap-1 px-2 py-1 rounded border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f8f9fa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft style={{ width: 14, height: 14 }} aria-hidden="true" />
            Prev
          </button>
          <span className="px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="flex items-center gap-1 px-2 py-1 rounded border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f8f9fa] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight style={{ width: 14, height: 14 }} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
