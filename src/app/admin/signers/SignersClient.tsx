'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Dialog } from '@/components/ui/Dialog'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { useToast } from '@/components/ui/Toast'
import { Pencil, Trash2 } from 'lucide-react'

interface Org {
  id: string
  name: string
}

interface Signer {
  id: string
  fullName: string
  title: string
  employeeId: string | null
  isActive: boolean
  createdAt: string
}

interface SignersClientProps {
  orgs: Org[]
}

const LIMIT = 20

export function SignersClient({ orgs }: SignersClientProps) {
  const { showToast, ToastContainer } = useToast()

  // List state
  const [orgId, setOrgId] = useState<string>(orgs[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [signers, setSigners] = useState<Signer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Add dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addFullName, setAddFullName] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addEmployeeId, setAddEmployeeId] = useState('')
  const [addIsActive, setAddIsActive] = useState(true)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editSigner, setEditSigner] = useState<Signer | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editEmployeeId, setEditEmployeeId] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // Delete confirm dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSigner, setDeleteSigner] = useState<Signer | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const fetchSigners = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        orgId,
        page: String(page),
        limit: String(LIMIT),
      })
      if (search) params.set('search', search)
      const res = await fetch(`/api/signers?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setSigners(json.data?.data ?? [])
        setTotal(json.data?.total ?? 0)
      }
    } catch {
      showToast('Failed to load signers.', 'error')
    } finally {
      setLoading(false)
    }
  }, [orgId, search, page, showToast])

  useEffect(() => {
    fetchSigners()
  }, [fetchSigners])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [orgId, search])

  // ── Add ──────────────────────────────────────────────────────────────────────

  function openAdd() {
    setAddFullName('')
    setAddTitle('')
    setAddEmployeeId('')
    setAddIsActive(true)
    setAddErrors({})
    setAddOpen(true)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!addFullName.trim()) errors.fullName = 'Full name is required.'
    if (!addTitle.trim()) errors.title = 'Title is required.'
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors)
      return
    }

    setAddSubmitting(true)
    try {
      const res = await fetch('/api/signers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          fullName: addFullName.trim(),
          title: addTitle.trim(),
          employeeId: addEmployeeId.trim() || null,
          isActive: addIsActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to add signer.', 'error')
      } else {
        setAddOpen(false)
        showToast('Signer added successfully.', 'success')
        setPage(1)
        fetchSigners()
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setAddSubmitting(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  function openEdit(signer: Signer) {
    setEditSigner(signer)
    setEditFullName(signer.fullName)
    setEditTitle(signer.title)
    setEditEmployeeId(signer.employeeId ?? '')
    setEditIsActive(signer.isActive)
    setEditErrors({})
    setEditOpen(true)
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editSigner) return
    const errors: Record<string, string> = {}
    if (!editFullName.trim()) errors.fullName = 'Full name is required.'
    if (!editTitle.trim()) errors.title = 'Title is required.'
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors)
      return
    }

    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/signers/${editSigner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          title: editTitle.trim(),
          employeeId: editEmployeeId.trim() || null,
          isActive: editIsActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to update signer.', 'error')
      } else {
        setEditOpen(false)
        showToast('Signer updated successfully.', 'success')
        fetchSigners()
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  function openDelete(signer: Signer) {
    setDeleteSigner(signer)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteSigner) return
    setDeleteSubmitting(true)
    try {
      const res = await fetch(`/api/signers/${deleteSigner.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to delete signer.', 'error')
      } else {
        setDeleteOpen(false)
        showToast(`Signer "${deleteSigner.fullName}" removed.`, 'success')
        setPage(1)
        fetchSigners()
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── Table columns ─────────────────────────────────────────────────────────────

  const columns: ColumnDef<Signer>[] = [
    {
      header: 'Full Name',
      accessor: 'fullName',
      sortKey: 'fullName',
    },
    {
      header: 'Title',
      accessor: 'title',
    },
    {
      header: 'Employee ID',
      accessor: (row) => (
        <span className={row.employeeId ? 'text-[#111827]' : 'text-[#9ca3af]'}>
          {row.employeeId ?? '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span
          className={[
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
            row.isActive
              ? 'bg-[#dcfce7] text-[#15803d]'
              : 'bg-[#f3f4f6] text-[#6b7280]',
          ].join(' ')}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            aria-label={`Edit signer ${row.fullName}`}
            className="p-1.5 rounded text-[#6b7280] hover:text-[#111827] hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] transition-colors"
          >
            <Pencil style={{ width: 14, height: 14 }} aria-hidden="true" />
          </button>
          <button
            onClick={() => openDelete(row)}
            aria-label={`Delete signer ${row.fullName}`}
            className="p-1.5 rounded text-[#6b7280] hover:text-[#dc2626] hover:bg-[#fee2e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626] transition-colors"
          >
            <Trash2 style={{ width: 14, height: 14 }} aria-hidden="true" />
          </button>
        </div>
      ),
      className: 'w-24',
    },
  ]

  const orgOptions = orgs.map((o) => ({ value: o.id, label: o.name }))

  return (
    <>
      <ToastContainer />

      {/* Top controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="w-64">
          <Select
            label="Organization"
            options={orgOptions}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search"
            placeholder="Name, title, or employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button variant="primary" size="sm" onClick={openAdd} disabled={!orgId}>
            + Add Signer
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable<Signer>
        columns={columns}
        data={signers}
        totalCount={total}
        page={page}
        pageSize={LIMIT}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage={orgId ? 'No signers found for this organization.' : 'Select an organization to view signers.'}
        getRowKey={(row) => row.id}
      />

      {/* Footer note */}
      <p className="mt-3 text-[12px] text-[#9ca3af]">
        Unit hierarchy (Division &gt; Department &gt; Sub-department) is planned for a future release.
      </p>

      {/* ── Add Signer Dialog ─────────────────────────────────────────────────── */}
      <Dialog isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Signer">
        <form onSubmit={handleAdd} noValidate className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={addFullName}
            onChange={(e) => { setAddFullName(e.target.value); setAddErrors((p) => ({ ...p, fullName: '' })) }}
            error={addErrors.fullName}
            placeholder="e.g., Dr. Budi Santoso, M.M."
            required
          />
          <Input
            label="Title"
            value={addTitle}
            onChange={(e) => { setAddTitle(e.target.value); setAddErrors((p) => ({ ...p, title: '' })) }}
            error={addErrors.title}
            placeholder="e.g., Direktur Utama"
            required
          />
          <Input
            label="Employee ID (optional)"
            value={addEmployeeId}
            onChange={(e) => setAddEmployeeId(e.target.value)}
            placeholder="e.g., EMP-001"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="add-is-active"
              checked={addIsActive}
              onChange={(e) => setAddIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#e5e7eb] text-[#1e3a5f] focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            />
            <label htmlFor="add-is-active" className="text-[14px] text-[#111827]">
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={addSubmitting}>
              Add Signer
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Edit Signer Dialog ────────────────────────────────────────────────── */}
      <Dialog
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit Signer: ${editSigner?.fullName ?? ''}`}
      >
        <form onSubmit={handleEdit} noValidate className="flex flex-col gap-4">
          <Input
            label="Full Name"
            value={editFullName}
            onChange={(e) => { setEditFullName(e.target.value); setEditErrors((p) => ({ ...p, fullName: '' })) }}
            error={editErrors.fullName}
            placeholder="e.g., Dr. Budi Santoso, M.M."
            required
          />
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => { setEditTitle(e.target.value); setEditErrors((p) => ({ ...p, title: '' })) }}
            error={editErrors.title}
            placeholder="e.g., Direktur Utama"
            required
          />
          <Input
            label="Employee ID (optional)"
            value={editEmployeeId}
            onChange={(e) => setEditEmployeeId(e.target.value)}
            placeholder="e.g., EMP-001"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-is-active"
              checked={editIsActive}
              onChange={(e) => setEditIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[#e5e7eb] text-[#1e3a5f] focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            />
            <label htmlFor="edit-is-active" className="text-[14px] text-[#111827]">
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={editSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────────── */}
      <Dialog isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Remove Signer">
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[#111827]">
            Remove{' '}
            <strong>{deleteSigner?.fullName}</strong>?
          </p>
          <p className="text-[13px] text-[#6b7280]">
            This signer will be marked as inactive and hidden from new issuances. Existing records will be preserved.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={deleteSubmitting}
              onClick={handleDelete}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
