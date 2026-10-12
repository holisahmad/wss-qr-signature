import { connection } from 'next/server'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import type { DocumentStatus } from '@/generated/prisma/enums'

async function getStats() {
  // connection() ensures dynamic rendering — required when using new Date() in Next.js 16
  await connection()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [total, issued, revoked, draft, issuedThisMonth, recentIssuances] =
    await db.$transaction([
      db.documentIssuance.count(),
      db.documentIssuance.count({ where: { status: 'ISSUED' } }),
      db.documentIssuance.count({ where: { status: 'REVOKED' } }),
      db.documentIssuance.count({ where: { status: 'DRAFT' } }),
      db.documentIssuance.count({
        where: { status: 'ISSUED', issuanceTimestamp: { gte: firstOfMonth } },
      }),
      db.documentIssuance.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ref: true,
          title: true,
          status: true,
          createdAt: true,
          signer: { select: { fullName: true } },
        },
      }),
    ])

  return { total, issued, revoked, draft, issuedThisMonth, recentIssuances }
}

export async function DashboardStats() {
  const { total, issued, revoked, draft, issuedThisMonth, recentIssuances } = await getStats()

  const stats = [
    { label: 'Total Issuances', value: total, description: 'All documents in the system' },
    { label: 'Active (Issued)', value: issued, description: 'Currently valid documents' },
    { label: 'Issued This Month', value: issuedThisMonth, description: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }) },
    { label: 'Revoked', value: revoked, description: 'Documents revoked by admin' },
    { label: 'Drafts Pending', value: draft, description: 'Awaiting issuance' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <section aria-label="Issuance statistics">
        <h2 className="text-[13px] font-semibold text-[--color-text-secondary] uppercase tracking-wide mb-3">
          Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[--color-surface] border border-[--color-border] rounded p-4"
            >
              <p className="text-[28px] font-bold text-[--color-brand] leading-none tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1 text-[13px] font-medium text-[--color-text-primary]">
                {stat.label}
              </p>
              <p className="mt-0.5 text-[12px] text-[--color-text-secondary]">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent issuances */}
      <section aria-label="Recent issuances">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[--color-text-secondary] uppercase tracking-wide">
            Recent Issuances
          </h2>
          <Link
            href="/admin/issuances"
            className="text-[13px] text-[--color-accent] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] rounded"
          >
            View all →
          </Link>
        </div>

        <div className="bg-[--color-surface] border border-[--color-border] rounded overflow-hidden">
          {recentIssuances.length === 0 ? (
            <p className="px-4 py-8 text-center text-[14px] text-[--color-text-secondary]">
              No issuances yet.{' '}
              <Link href="/admin/issuances/new" className="text-[--color-accent] hover:underline">
                Create the first one
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-[--color-border] bg-[--color-background]">
                  <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[--color-text-secondary] uppercase tracking-wide">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[--color-text-secondary] uppercase tracking-wide hidden sm:table-cell">
                    Signer
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[--color-text-secondary] uppercase tracking-wide">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-left text-[12px] font-semibold text-[--color-text-secondary] uppercase tracking-wide hidden md:table-cell">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-semibold text-[--color-text-secondary] uppercase tracking-wide">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentIssuances.map((issuance, idx) => (
                  <tr
                    key={issuance.id}
                    className={[
                      'hover:bg-[--color-background] transition-colors',
                      idx < recentIssuances.length - 1 ? 'border-b border-[--color-border]' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 text-[--color-text-primary] font-medium max-w-[200px] truncate">
                      {issuance.title}
                    </td>
                    <td className="px-4 py-3 text-[--color-text-secondary] hidden sm:table-cell">
                      {issuance.signer.fullName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={issuance.status as DocumentStatus} />
                    </td>
                    <td className="px-4 py-3 text-[--color-text-secondary] text-[13px] hidden md:table-cell">
                      {new Intl.DateTimeFormat('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(issuance.createdAt))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/issuances/${issuance.id}`}
                        className="text-[13px] text-[--color-accent] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent] rounded"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
