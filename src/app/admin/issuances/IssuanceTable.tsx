import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { DocumentStatus } from '@/generated/prisma/enums'

interface IssuanceRow {
  id: string
  ref: string
  title: string
  docNumber: string
  status: string
  createdAt: Date
  signer: { fullName: string }
  org: { name: string }
}

interface IssuanceTableProps {
  issuances: IssuanceRow[]
  total: number
  page: number
  pageSize: number
}

export function IssuanceTable({ issuances, total, page, pageSize }: IssuanceTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (issuances.length === 0) {
    return (
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded p-10 text-center">
        <p className="text-[14px] text-[#6b7280]">
          No issuances match your filters.{' '}
          <Link href="/admin/issuances" className="text-[#2563eb] hover:underline">
            Clear filters
          </Link>{' '}
          or{' '}
          <Link href="/admin/issuances/new" className="text-[#2563eb] hover:underline">
            create your first issuance
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded border border-[#e5e7eb]">
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-[#f8f9fa]">
              <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Title
              </th>
              <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide hidden sm:table-cell">
                Doc Number
              </th>
              <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">
                Signer
              </th>
              <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide hidden lg:table-cell">
                Organization
              </th>
              <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide hidden md:table-cell">
                Created
              </th>
              <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#6b7280] uppercase tracking-wide">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {issuances.map((issuance, idx) => (
              <tr
                key={issuance.id}
                className={[
                  'hover:bg-[#f8f9fa] transition-colors',
                  idx < issuances.length - 1 ? 'border-b border-[#e5e7eb]' : '',
                ].join(' ')}
              >
                <td className="px-4 py-3 text-[#111827] font-medium max-w-[200px]">
                  <span className="block truncate" title={issuance.title}>
                    {issuance.title}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6b7280] font-mono text-[13px] hidden sm:table-cell">
                  {issuance.docNumber}
                </td>
                <td className="px-4 py-3 text-[#6b7280] hidden md:table-cell">
                  {issuance.signer.fullName}
                </td>
                <td className="px-4 py-3 text-[#6b7280] hidden lg:table-cell max-w-[140px]">
                  <span className="block truncate" title={issuance.org.name}>
                    {issuance.org.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge status={issuance.status as DocumentStatus} />
                </td>
                <td className="px-4 py-3 text-[#6b7280] text-[13px] hidden md:table-cell">
                  {new Intl.DateTimeFormat('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(issuance.createdAt))}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/issuances/${issuance.id}`}
                    className="text-[13px] text-[#2563eb] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] rounded"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination info + links */}
      <div className="flex items-center justify-between px-1 text-[13px] text-[#6b7280]">
        <span>
          {total === 0 ? 'No results' : `${from}–${to} of ${total} issuances`}
        </span>
        <div className="flex items-center gap-1">
          {page > 1 && (
            <PageLink page={page - 1} label="← Prev" />
          )}
          <span className="px-2">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <PageLink page={page + 1} label="Next →" />
          )}
        </div>
      </div>
    </div>
  )
}

function PageLink({ page, label }: { page: number; label: string }) {
  return (
    <Link
      href={`?page=${page}`}
      className="px-2 py-1 rounded border border-[#e5e7eb] bg-[#ffffff] text-[13px] hover:bg-[#f8f9fa] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
    >
      {label}
    </Link>
  )
}
