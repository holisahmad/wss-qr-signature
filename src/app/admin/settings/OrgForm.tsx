'use client'

import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface Org {
  id: string
  name: string
  slug: string
  address: string | null
  website: string | null
}

interface OrgFormProps {
  org: Org
}

export function OrgForm({ org }: OrgFormProps) {
  const { showToast, ToastContainer } = useToast()

  const [name, setName] = useState(org.name)
  const [address, setAddress] = useState(org.address ?? '')
  const [website, setWebsite] = useState(org.website ?? '')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})

    // Basic validation
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Organization name is required'
    if (website && !/^https?:\/\//.test(website)) {
      errs.website = 'Website must start with http:// or https://'
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          website: website.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error?.message ?? 'Failed to update organization.', 'error')
      } else {
        showToast('Organization profile updated.', 'success')
      }
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Organization Name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          placeholder="e.g., Universitas Contoh"
        />
        <Input
          label="Address"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address (optional)"
        />
        <Input
          label="Website"
          name="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          error={errors.website}
          placeholder="https://example.ac.id"
        />
        <div>
          <Button type="submit" variant="primary" size="sm" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </>
  )
}
