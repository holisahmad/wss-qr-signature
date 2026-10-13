'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

const DOC_TYPE_OPTIONS: SelectOption[] = [
  { value: 'Surat Keputusan', label: 'Surat Keputusan (SK)' },
  { value: 'Surat Tugas', label: 'Surat Tugas' },
  { value: 'Sertifikat', label: 'Sertifikat' },
  { value: 'Memo', label: 'Memo' },
  { value: 'Other', label: 'Other' },
]

interface Org { id: string; name: string }
interface Unit { id: string; name: string; code: string | null }
interface Signer { id: string; fullName: string; title: string }

interface FormErrors {
  title?: string
  docNumber?: string
  docType?: string
  orgId?: string
  signerId?: string
  docDate?: string
  issuanceTimestamp?: string
  general?: string
}

interface DuplicateWarning {
  ref: string
  status: string
}

export function IssuanceForm() {
  const router = useRouter()

  // Form state
  const [title, setTitle] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [docType, setDocType] = useState('')
  const [description, setDescription] = useState('')
  const [orgId, setOrgId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [signerId, setSignerId] = useState('')
  const [docDate, setDocDate] = useState('')
  const [issuanceTimestamp, setIssuanceTimestamp] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [adminNotes, setAdminNotes] = useState('')

  // Data for selects
  const [orgs, setOrgs] = useState<Org[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [signers, setSigners] = useState<Signer[]>([])

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [duplicate, setDuplicate] = useState<DuplicateWarning | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  // Load organizations on mount
  useEffect(() => {
    fetch('/api/organizations')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setOrgs(json.data)
      })
      .catch(() => {/* non-fatal */})
  }, [])

  // Load units + signers when org changes
  useEffect(() => {
    let cancelled = false

    async function loadOrgData() {
      if (!orgId) {
        if (!cancelled) {
          setUnits([])
          setSigners([])
          setUnitId('')
          setSignerId('')
        }
        return
      }
      try {
        const [uRes, sRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}/units`),
          fetch(`/api/organizations/${orgId}/signers`),
        ])
        const [uJson, sJson] = await Promise.all([uRes.json(), sRes.json()])
        if (!cancelled) {
          setUnits((uJson.data ?? []) as Unit[])
          setSigners((sJson.data ?? []) as Signer[])
          setUnitId('')
          setSignerId('')
        }
      } catch {
        // non-fatal
      }
    }

    void loadOrgData()
    return () => { cancelled = true }
  }, [orgId])

  // Check for duplicate docNumber when user leaves the field
  async function checkDuplicate() {
    if (!docNumber || !orgId) return
    setCheckingDuplicate(true)
    try {
      const res = await fetch(
        `/api/issuances?docNumber=${encodeURIComponent(docNumber)}&orgId=${encodeURIComponent(orgId)}&limit=1`
      )
      const json = await res.json()
      if (json.data?.data?.length > 0) {
        const found = json.data.data[0] as { ref: string; status: string }
        setDuplicate({ ref: found.ref, status: found.status })
      } else {
        setDuplicate(null)
      }
    } catch {
      setDuplicate(null)
    } finally {
      setCheckingDuplicate(false)
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (!docNumber.trim()) errs.docNumber = 'Document number is required'
    if (!docType) errs.docType = 'Document type is required'
    if (!orgId) errs.orgId = 'Organization is required'
    if (!signerId) errs.signerId = 'Signer is required'
    if (!docDate) errs.docDate = 'Document date is required'
    if (!issuanceTimestamp) errs.issuanceTimestamp = 'Issuance timestamp is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})

    try {
      const res = await fetch('/api/issuances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          docNumber: docNumber.trim(),
          docType,
          description: description.trim() || null,
          orgId,
          unitId: unitId || null,
          signerId,
          docDate,
          issuanceTimestamp: new Date(issuanceTimestamp).toISOString(),
          adminNotes: adminNotes.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setErrors({ docNumber: json.error?.message ?? 'Document number already exists for this organization.' })
        } else if (res.status === 422 && json.error?.details) {
          const fieldErrors: FormErrors = {}
          for (const issue of json.error.details as { path: string[]; message: string }[]) {
            const field = issue.path[0] as keyof FormErrors
            if (field) fieldErrors[field] = issue.message
          }
          setErrors(fieldErrors)
        } else {
          setErrors({ general: json.error?.message ?? 'Failed to create issuance.' })
        }
        return
      }

      router.push(`/admin/issuances/${json.data.id}`)
    } catch {
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const orgOptions: SelectOption[] = orgs.map((o) => ({ value: o.id, label: o.name }))
  const unitOptions: SelectOption[] = units.map((u) => ({
    value: u.id,
    label: u.code ? `${u.name} (${u.code})` : u.name,
  }))
  const signerOptions: SelectOption[] = signers.map((s) => ({
    value: s.id,
    label: `${s.fullName} — ${s.title}`,
  }))

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {errors.general && (
        <div role="alert" className="px-3 py-2.5 rounded border border-[#dc2626] bg-[#fee2e2] text-[14px] text-[#dc2626]">
          {errors.general}
        </div>
      )}

      {/* Document details */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
          Document Details
        </legend>

        <Input
          label="Document Title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder="e.g., Sertifikat Penyelesaian Pelatihan"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Document Number"
            name="docNumber"
            required
            value={docNumber}
            onChange={(e) => { setDocNumber(e.target.value); setDuplicate(null) }}
            onBlur={checkDuplicate}
            error={errors.docNumber}
            placeholder="e.g., SK/2024/001"
          />
          <Select
            label="Document Type"
            name="docType"
            required
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            options={DOC_TYPE_OPTIONS}
            placeholder="Select type..."
            error={errors.docType}
          />
        </div>

        {duplicate && (
          <div role="status" className="px-3 py-2.5 rounded border border-[#b45309] bg-[#fef3c7] text-[13px] text-[#b45309]">
            ⚠ A document with this number already exists for this organization (Ref:{' '}
            <a
              href={`/admin/issuances?search=${encodeURIComponent(duplicate.ref)}`}
              className="font-mono underline hover:no-underline"
            >
              {duplicate.ref}
            </a>
            , status: {duplicate.status}). You may still proceed if intentional.
            {checkingDuplicate && ' Checking...'}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Document Date"
            name="docDate"
            type="date"
            required
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            error={errors.docDate}
          />
          <Input
            label="Issuance Timestamp"
            name="issuanceTimestamp"
            type="datetime-local"
            required
            value={issuanceTimestamp}
            onChange={(e) => setIssuanceTimestamp(e.target.value)}
            error={errors.issuanceTimestamp}
          />
        </div>

        <Textarea
          label="Description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the document (optional)"
          rows={3}
        />
      </fieldset>

      {/* Organization & Signer */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
          Organization &amp; Signer
        </legend>

        <Select
          label="Organization"
          name="orgId"
          required
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          options={orgOptions}
          placeholder="Select organization..."
          error={errors.orgId}
        />

        {orgId && (
          <Select
            label="Organizational Unit (optional)"
            name="unitId"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            options={unitOptions}
            placeholder={units.length === 0 ? 'No units for this org' : 'Select unit (optional)...'}
            disabled={units.length === 0}
          />
        )}

        {orgId && (
          <Select
            label="Signer"
            name="signerId"
            required
            value={signerId}
            onChange={(e) => setSignerId(e.target.value)}
            options={signerOptions}
            placeholder={signers.length === 0 ? 'No active signers for this org' : 'Select signer...'}
            error={errors.signerId}
            disabled={signers.length === 0}
          />
        )}

        {!orgId && (
          <p className="text-[13px] text-[#6b7280]">
            Select an organization to load its units and signers.
          </p>
        )}
      </fieldset>

      {/* Admin notes */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
          Internal Notes
        </legend>
        <Textarea
          label="Admin Notes (internal, not shown publicly)"
          name="adminNotes"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Optional internal notes for this issuance"
          rows={2}
        />
      </fieldset>

      <div className="flex items-center gap-3 pt-2 border-t border-[#e5e7eb]">
        <Button type="submit" variant="primary" size="md" loading={loading}>
          Create Draft Issuance
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
