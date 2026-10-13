import { PageHeader } from '@/components/ui/PageHeader'
import { IssuanceForm } from './IssuanceForm'

export const metadata = {
  title: 'New Issuance — WSS QR Signature',
}

export const instant = false

export default function NewIssuancePage() {
  return (
    <>
      <PageHeader
        title="New Issuance"
        subtitle="Create a new document issuance. It will be saved as a draft until you issue it."
      />
      <div className="max-w-2xl">
        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded p-5">
          <IssuanceForm />
        </div>
      </div>
    </>
  )
}
