'use client'

import { useState, useRef, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface LogoUploadProps {
  orgId: string
  currentLogoPath: string | null
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export function LogoUpload({ orgId, currentLogoPath }: LogoUploadProps) {
  const { showToast, ToastContainer } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const [hasFile, setHasFile] = useState(false)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const file = e.target.files?.[0]
    if (!file) {
      setHasFile(false)
      return
    }

    // Client-side pre-validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Only PNG, JPEG, and SVG files are allowed.')
      e.target.value = ''
      setHasFile(false)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setFileError(`File size must be under 2 MB (current: ${(file.size / 1024 / 1024).toFixed(1)} MB).`)
      e.target.value = ''
      setHasFile(false)
      return
    }

    // Show preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setHasFile(true)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setFileError('Please select a file first.')
      return
    }

    setUploading(true)
    setFileError('')

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch(`/api/organizations/${orgId}/logo`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (!res.ok) {
        showToast(json.error?.message ?? 'Upload failed.', 'error')
      } else {
        showToast('Logo updated successfully.', 'success')
        if (fileRef.current) fileRef.current.value = ''
        setHasFile(false)
        setPreviewUrl(null)
      }
    } catch {
      showToast('Network error during upload.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="flex flex-col gap-3">
        {/* Current logo preview */}
        {(previewUrl ?? currentLogoPath) && (
          <div>
            <p className="text-[12px] text-[--color-text-secondary] mb-1">
              {previewUrl ? 'New logo preview:' : 'Current logo:'}
            </p>
            <img
              src={previewUrl ?? `/uploads/logos/${currentLogoPath}`}
              alt="Organization logo preview"
              className="h-16 w-auto border border-[--color-border] rounded bg-white p-1"
            />
          </div>
        )}

        <div>
          <label htmlFor="logo-upload" className="text-[13px] font-medium text-[--color-text-primary] block mb-1">
            Upload New Logo
          </label>
          <input
            ref={fileRef}
            id="logo-upload"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleFileChange}
            aria-describedby={fileError ? 'logo-error' : 'logo-help'}
            className="block w-full text-[13px] text-[--color-text-secondary] file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-[--color-border] file:bg-[--color-background] file:text-[13px] file:text-[--color-text-primary] hover:file:bg-[--color-surface] file:cursor-pointer"
          />
          {fileError ? (
            <p id="logo-error" role="alert" className="mt-1 text-[12px] text-[--color-danger]">
              {fileError}
            </p>
          ) : (
            <p id="logo-help" className="mt-1 text-[12px] text-[--color-text-secondary]">
              PNG, JPEG, or SVG. Max 2 MB. Will be resized to ≤ 300×300 px.
            </p>
          )}
        </div>

        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            onClick={handleUpload}
            disabled={!hasFile}
          >
            Upload Logo
          </Button>
        </div>

        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-800">
          <strong>Note:</strong> Updating the logo does not retroactively change previously
          generated signature blocks. Re-issue documents to update them.
        </div>
      </div>
    </>
  )
}
