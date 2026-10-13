import { db } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { SignersClient } from './SignersClient'

export const instant = false

export const metadata = {
  title: 'Signers — WSS QR Signature',
}

export default async function SignersPage() {
  const orgs = await db.organization.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <>
      <PageHeader
        title="Signers"
        subtitle="Manage document signers for all organizations"
      />
      <SignersClient orgs={orgs} />
    </>
  )
}
