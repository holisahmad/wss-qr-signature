'use client'

import { useState, type FormEvent } from 'react'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

interface Unit {
  id: string
  name: string
  code: string | null
}

interface OrgUnitsManagerProps {
  orgId: string
  initialUnits: Unit[]
}

export function OrgUnitsManager({ orgId, initialUnits }: OrgUnitsManagerProps) {
  const { showToast, ToastContainer } = useToast()
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      setAddError('Name is required.')
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch(`/api/organizations/${orgId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), code: newCode.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddError(json.error?.message ?? 'Failed to add unit.')
      } else {
        setUnits((prev) => [...prev, json.data])
        setNewName('')
        setNewCode('')
        showToast('Organizational unit added.', 'success')
      }
    } catch {
      setAddError('Network error.')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(unit: Unit) {
    setEditId(unit.id)
    setEditName(unit.name)
    setEditCode(unit.code ?? '')
  }

  function cancelEdit() {
    setEditId(null)
  }

  async function saveEdit(unitId: string) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${orgId}/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), code: editCode.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to update unit.', 'error')
      } else {
        setUnits((prev) => prev.map((u) => (u.id === unitId ? json.data : u)))
        setEditId(null)
        showToast('Unit updated.', 'success')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(unitId: string, unitName: string) {
    if (!confirm(`Delete unit "${unitName}"? This cannot be undone if no documents are linked.`)) {
      return
    }
    try {
      const res = await fetch(`/api/organizations/${orgId}/units/${unitId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to delete unit.', 'error')
      } else {
        setUnits((prev) => prev.filter((u) => u.id !== unitId))
        showToast(`Unit "${unitName}" deleted.`, 'success')
      }
    } catch {
      showToast('Network error.', 'error')
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="flex flex-col gap-4">
        {/* Existing units */}
        {units.length === 0 ? (
          <p className="text-[13px] text-[#6b7280]">
            No organizational units configured yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1" aria-label="Organizational units">
            {units.map((unit) =>
              editId === unit.id ? (
                <li
                  key={unit.id}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-[#2563eb] bg-[#ffffff]"
                >
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Edit unit name"
                    className="flex-1 h-7 rounded border border-[#e5e7eb] px-2 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  />
                  <input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    aria-label="Edit unit code"
                    placeholder="Code"
                    className="w-20 h-7 rounded border border-[#e5e7eb] px-2 text-[13px] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  />
                  <button
                    onClick={() => saveEdit(unit.id)}
                    disabled={saving}
                    aria-label="Save changes"
                    className="p-1 rounded text-[#15803d] hover:bg-[#dcfce7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  >
                    <Check style={{ width: 14, height: 14 }} aria-hidden="true" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    aria-label="Cancel edit"
                    className="p-1 rounded text-[#6b7280] hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  >
                    <X style={{ width: 14, height: 14 }} aria-hidden="true" />
                  </button>
                </li>
              ) : (
                <li
                  key={unit.id}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-[#e5e7eb] bg-[#ffffff] hover:bg-[#f8f9fa] transition-colors"
                >
                  <span className="flex-1 text-[14px] text-[#111827]">
                    {unit.name}
                  </span>
                  {unit.code && (
                    <span className="text-[12px] font-mono text-[#6b7280] bg-[#f3f4f6] px-1.5 py-0.5 rounded">
                      {unit.code}
                    </span>
                  )}
                  <button
                    onClick={() => startEdit(unit)}
                    aria-label={`Edit unit ${unit.name}`}
                    className="p-1 rounded text-[#6b7280] hover:text-[#111827] hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                  >
                    <Pencil style={{ width: 13, height: 13 }} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDelete(unit.id, unit.name)}
                    aria-label={`Delete unit ${unit.name}`}
                    className="p-1 rounded text-[#6b7280] hover:text-[#dc2626] hover:bg-[#fee2e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
                  >
                    <Trash2 style={{ width: 13, height: 13 }} aria-hidden="true" />
                  </button>
                </li>
              )
            )}
          </ul>
        )}

        {/* Add new unit */}
        <form onSubmit={handleAdd} noValidate className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-[#111827]">Add Unit</p>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <Input
                label="Unit Name"
                name="unitName"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError('') }}
                error={addError}
                placeholder="e.g., Faculty of Engineering"
                required
              />
            </div>
            <div className="w-28">
              <Input
                label="Code (optional)"
                name="unitCode"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="FT"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" size="sm" loading={adding}>
                <Plus style={{ width: 14, height: 14 }} aria-hidden="true" />
                Add
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
