import { Suspense } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { DashboardStats } from './DashboardStats'

export const metadata = {
  title: 'Dashboard — WSS QR Signature',
}

// Allow blocking route — dashboard always renders fresh DB counts
export const instant = false

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#ffffff] border border-[#e5e7eb] rounded p-4 h-24" />
        ))}
      </div>
      <div className="bg-[#ffffff] border border-[#e5e7eb] rounded h-48" />
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of document issuances in WSS QR Signature"
        action={
          <Link href="/admin/issuances/new">
            <Button variant="primary" size="sm">
              + New Issuance
            </Button>
          </Link>
        }
      />
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </>
  )
}
