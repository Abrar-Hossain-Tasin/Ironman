'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { isStorageConfigured, uploadEvidencePhoto } from '@/lib/storage'

type PhotoEvidenceFieldProps = {
  notes: string
  photoUrls: string[]
  onNotesChange: (value: string) => void
  onPhotoUrlsChange: (value: string[]) => void
  orderId: string
  assignmentId?: string
  kind?: 'pickup' | 'delivery' | 'wash' | 'iron' | 'dry_clean' | 'issue' | 'other'
  placeholder?: string
  notesLabel?: string
  disabled?: boolean
}

export function PhotoEvidenceField({
  notes,
  photoUrls,
  onNotesChange,
  onPhotoUrlsChange,
  orderId,
  assignmentId,
  kind = 'other',
  placeholder = 'e.g. handed to customer; one shirt slightly damp',
  notesLabel = 'Notes',
  disabled
}: PhotoEvidenceFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')

  const storageReady = isStorageConfigured()

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError(null)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      try {
        const url = await uploadEvidencePhoto({ file, orderId, assignmentId, kind })
        uploaded.push(url)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
        break
      }
    }
    setUploading(false)
    if (uploaded.length > 0) {
      onPhotoUrlsChange([...photoUrls, ...uploaded])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeUrl(url: string) {
    onPhotoUrlsChange(photoUrls.filter((value) => value !== url))
  }

  function addManualUrl() {
    const trimmed = manualUrl.trim()
    if (!trimmed) return
    if (!/^https?:\/\//i.test(trimmed)) {
      setUploadError('Photo URL must start with http(s)://')
      return
    }
    if (!photoUrls.includes(trimmed)) {
      onPhotoUrlsChange([...photoUrls, trimmed])
    }
    setManualUrl('')
    setUploadError(null)
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{notesLabel}</span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring disabled:opacity-60"
        />
      </label>

      <div>
        <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          <Camera className="h-3.5 w-3.5" aria-hidden /> Photo evidence
        </span>

        {photoUrls.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {photoUrls.map((url) => (
              <figure
                key={url}
                className="relative h-20 w-20 overflow-hidden rounded-lg border border-ironman-navy-100 bg-ironman-navy-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="evidence" className="h-full w-full object-cover" />
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    aria-label="Remove photo"
                    className="focus-ring absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ironman-navy text-white"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {storageReady ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-semibold text-ironman-navy disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
                {uploading ? 'Uploading…' : 'Take / upload photo'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                hidden
                onChange={(event) => void handleFiles(event.target.files)}
              />
            </>
          ) : (
            <p className="text-xs text-amber-700">
              Supabase storage is not configured in this environment — paste image URLs instead.
            </p>
          )}

          <div className="flex flex-1 items-center gap-2">
            <input
              value={manualUrl}
              onChange={(event) => setManualUrl(event.target.value)}
              disabled={disabled}
              placeholder="…or paste an image URL"
              className="tap-target w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm focus-ring disabled:opacity-60"
            />
            <button
              type="button"
              onClick={addManualUrl}
              disabled={disabled || !manualUrl.trim()}
              className="tap-target focus-ring rounded-lg bg-ironman-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </div>

        {uploadError ? (
          <p className="mt-1 rounded-lg bg-ironman-red-50 px-3 py-2 text-xs font-semibold text-ironman-red">
            {uploadError}
          </p>
        ) : null}
      </div>
    </div>
  )
}
