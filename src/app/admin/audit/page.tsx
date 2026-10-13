import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/PageHeader'
import { AuditLogClient } from './AuditLogClient'

export const metadata: Metadata = {
  title: 'Audit Log — WSS QR Signature',
}

export const instant = false

export default function AuditLogPage() {
  return (
    <>
      <PageHeader title="Audit Log" subtitle="Last 60 days of admin activity" />
      <AuditLogClient />
    </>
  )
}
