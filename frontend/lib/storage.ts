import { getSupabaseClient } from '@/lib/supabase'

const EVIDENCE_BUCKET = 'evidence'
const AVATAR_BUCKET = 'avatars'

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and create the required storage bucket.'
    )
  }
}

function sanitiseFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
  const stem = (dot >= 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 40)
  return `${stem || 'photo'}-${cryptoRandomId()}${ext}`
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return Math.random().toString(36).slice(2, 14)
}

export type EvidenceUploadParams = {
  file: File
  orderId: string
  assignmentId?: string
  kind?: 'pickup' | 'delivery' | 'wash' | 'iron' | 'dry_clean' | 'issue' | 'other'
}

export async function uploadEvidencePhoto({
  file,
  orderId,
  assignmentId,
  kind = 'other'
}: EvidenceUploadParams): Promise<string> {
  const client = getSupabaseClient()
  if (!client) throw new StorageNotConfiguredError()

  const fileName = sanitiseFileName(file.name || 'photo.jpg')
  const pathParts = [orderId, assignmentId ?? kind, fileName].filter(Boolean) as string[]
  const path = pathParts.join('/')

  const { error } = await client.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    })
  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data } = client.storage.from(EVIDENCE_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but public URL is unavailable.')
  }
  return data.publicUrl
}

export type ProfileUploadParams = {
  file: File
  userId: string
}

export async function uploadProfilePicture({ file, userId }: ProfileUploadParams): Promise<string> {
  const client = getSupabaseClient()
  if (!client) throw new StorageNotConfiguredError()

  const fileName = sanitiseFileName(file.name || 'avatar.jpg')
  const path = `${userId}/${fileName}`

  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    })
  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but public URL is unavailable.')
  }
  return data.publicUrl
}

export function isStorageConfigured(): boolean {
  return !!getSupabaseClient()
}
