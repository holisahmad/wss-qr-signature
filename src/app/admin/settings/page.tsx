import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { OrgForm } from './OrgForm'
import { LogoUpload } from './LogoUpload'
import { OrgUnitsManager } from './OrgUnitsManager'

export const metadata = {
  title: 'Settings — WSS QR Signature',
}

export const instant = false

async function getOrg() {
  // Return first organization (single-org MVP)
  return db.organization.findFirst({
    include: {
      units: { orderBy: { name: 'asc' } },
    },
  })
}

export default async function SettingsPage() {
  const org = await getOrg()

  if (!org) {
    // Redirect to create org flow (shouldn't happen post-seed, but handle defensively)
    redirect('/admin')
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Organization profile and structural configuration"
      />

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Organization profile */}
        <Card title="Organization Profile">
          <OrgForm
            org={{
              id: org.id,
              name: org.name,
              slug: org.slug,
              address: org.address,
              website: org.website,
            }}
          />
        </Card>

        {/* Logo management */}
        <Card title="Organization Logo">
          <LogoUpload orgId={org.id} currentLogoPath={org.logoPath} />
        </Card>

        {/* Organizational units */}
        <Card title="Organizational Units">
          <p className="text-[13px] text-[--color-text-secondary] mb-4">
            Units are departments or faculties within {org.name}. They are used to categorize
            issuances.
          </p>
          <OrgUnitsManager
            orgId={org.id}
            initialUnits={org.units.map((u) => ({
              id: u.id,
              name: u.name,
              code: u.code,
            }))}
          />
        </Card>

        {/* Info card */}
        <div className="px-4 py-3 rounded border border-[--color-border] bg-[--color-background] text-[13px] text-[--color-text-secondary]">
          <p>
            <strong className="text-[--color-text-primary]">Organization slug:</strong>{' '}
            <span className="font-mono">{org.slug}</span> — used in internal identifiers.
            Contact system administrator to change it.
          </p>
        </div>
      </div>
    </>
  )
}
