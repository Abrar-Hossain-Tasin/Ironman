'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Camera, Loader2, Pencil, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { StorageNotConfiguredError, uploadProfilePicture } from '@/lib/storage'
import type { AddressResponse, UserSummary } from '@/types'

type AddressDraft = {
  id?: string
  label: string
  addressLine1: string
  addressLine2: string
  area: string
  city: string
  postalCode: string
  defaultAddress: boolean
}

const emptyAddressDraft: AddressDraft = {
  label: 'Home',
  addressLine1: '',
  addressLine2: '',
  area: '',
  city: 'Dhaka',
  postalCode: '',
  defaultAddress: false
}

export function CustomerProfile() {
  const token = useAuthStore((state) => state.accessToken)
  const setAuthUser = useAuthStore((state) => state.setUser)
  const authUser = useAuthStore((state) => state.user)
  const [user, setUser] = useState<UserSummary | null>(null)
  const [addresses, setAddresses] = useState<AddressResponse[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddressDraft)
  const [editorOpen, setEditorOpen] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    Promise.all([
      apiFetch<UserSummary>('/users/me', { token }),
      apiFetch<AddressResponse[]>('/users/me/addresses', { token })
    ])
      .then(([nextUser, nextAddresses]) => {
        if (cancelled) return
        setUser(nextUser)
        setAddresses(nextAddresses)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load profile')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (passwordMessage) toast.success(passwordMessage)
  }, [passwordMessage])

  useEffect(() => {
    if (passwordError) toast.error(passwordError)
  }, [passwordError])

  function flashMessage(text: string) {
    setMessage(text)
    setError(null)
    window.setTimeout(() => setMessage((current) => (current === text ? null : current)), 3500)
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    try {
      const updated = await apiFetch<UserSummary>('/users/me', {
        method: 'PUT',
        token,
        body: {
          fullName: String(form.get('fullName') ?? ''),
          phone: String(form.get('phone') ?? ''),
          profilePictureUrl: user?.profilePictureUrl ?? null
        }
      })
      setUser(updated)
      // Keep the auth-store copy fresh so the header / role gates see the new name.
      if (authUser) {
        setAuthUser(updated)
      }
      flashMessage('Profile updated')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not save profile')
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !token || !user) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file for your profile picture.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile picture must be 2 MB or smaller.')
      return
    }
    setAvatarUploading(true)
    try {
      const profilePictureUrl = await uploadProfilePicture({ file, userId: user.id })
      const updated = await apiFetch<UserSummary>('/users/me', {
        method: 'PUT',
        token,
        body: {
          fullName: user.fullName,
          phone: user.phone,
          profilePictureUrl
        }
      })
      setUser(updated)
      if (authUser) {
        setAuthUser(updated)
      }
      toast.success('Profile picture updated')
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) {
        toast.error('Supabase avatar storage is not configured. Create an `avatars` bucket and set frontend Supabase env vars.')
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not upload profile picture')
      }
    } finally {
      setAvatarUploading(false)
    }
  }

  function openCreateAddress() {
    setAddressDraft({ ...emptyAddressDraft, defaultAddress: addresses.length === 0 })
    setEditorOpen(true)
    setError(null)
  }

  function openEditAddress(address: AddressResponse) {
    setAddressDraft({
      id: address.id,
      label: address.label,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? '',
      area: address.area,
      city: address.city,
      postalCode: address.postalCode ?? '',
      defaultAddress: address.defaultAddress
    })
    setEditorOpen(true)
    setError(null)
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    if (!addressDraft.addressLine1.trim() || !addressDraft.area.trim() || !addressDraft.city.trim()) {
      setError('Address line, area, and city are required.')
      return
    }
    setSavingAddress(true)
    setError(null)
    const body = {
      label: addressDraft.label.trim() || 'Home',
      addressLine1: addressDraft.addressLine1.trim(),
      addressLine2: addressDraft.addressLine2.trim() || null,
      area: addressDraft.area.trim(),
      city: addressDraft.city.trim(),
      postalCode: addressDraft.postalCode.trim() || null,
      defaultAddress: addressDraft.defaultAddress
    }
    try {
      const saved = await apiFetch<AddressResponse>(
        addressDraft.id ? `/users/me/addresses/${addressDraft.id}` : '/users/me/addresses',
        { method: addressDraft.id ? 'PUT' : 'POST', token, body }
      )
      setAddresses((current) => {
        // If the saved address is now default, flip others to non-default in our local cache.
        const next = current.some((row) => row.id === saved.id)
          ? current.map((row) => (row.id === saved.id ? saved : row))
          : [...current, saved]
        return saved.defaultAddress
          ? next.map((row) => (row.id === saved.id ? row : { ...row, defaultAddress: false }))
          : next
      })
      setEditorOpen(false)
      flashMessage(addressDraft.id ? 'Address updated' : 'Address added')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not save address')
    } finally {
      setSavingAddress(false)
    }
  }

  async function deleteAddress(address: AddressResponse) {
    if (!token) return
    if (!window.confirm(`Delete address "${address.label}"?`)) return
    try {
      await apiFetch(`/users/me/addresses/${address.id}`, { method: 'DELETE', token })
      setAddresses((current) => current.filter((row) => row.id !== address.id))
      flashMessage('Address deleted')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not delete address')
    }
  }

  async function makeDefault(address: AddressResponse) {
    if (!token || address.defaultAddress) return
    try {
      const saved = await apiFetch<AddressResponse>(`/users/me/addresses/${address.id}`, {
        method: 'PUT',
        token,
        body: {
          label: address.label,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? null,
          area: address.area,
          city: address.city,
          postalCode: address.postalCode ?? null,
          defaultAddress: true
        }
      })
      setAddresses((current) =>
        current.map((row) =>
          row.id === saved.id ? saved : { ...row, defaultAddress: false }
        )
      )
      flashMessage(`${saved.label} is now the default address`)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not update default')
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    setPasswordMessage(null)
    setPasswordError(null)
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    setPasswordSaving(true)
    try {
      await apiFetch('/users/me/password', {
        method: 'PUT',
        token,
        body: { currentPassword, newPassword }
      })
      setPasswordMessage('Password updated. Use the new password next time you sign in.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      // The endpoint may not yet exist on the backend. Surface the actual server
      // error rather than swallowing it — admins can read this and wire up the
      // route. (Listed in the audit as a P0 backend gap.)
      setPasswordError(
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
            ? err.message
            : 'Could not change password'
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <RequireAuth roles={['customer']}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-ironman-navy-50 ring-1 ring-ironman-navy-100">
              {user?.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-bold text-ironman-navy">
                  {(user?.fullName ?? authUser?.fullName ?? 'I').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-ironman-navy">Profile</h2>
              <label className="tap-target focus-ring mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ironman-navy-100 px-3 py-2 text-sm font-semibold text-ironman-navy">
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
                {avatarUploading ? 'Uploading...' : 'Upload picture'}
                <input type="file" accept="image/*" className="sr-only" onChange={uploadAvatar} disabled={avatarUploading} />
              </label>
            </div>
          </div>
          <form key={user?.id ?? 'profile-form'} className="mt-4 space-y-3" onSubmit={updateProfile}>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Full name</span>
              <input
                name="fullName"
                className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                defaultValue={user?.fullName ?? ''}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</span>
              <input
                className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-gray-500"
                value={user?.email ?? ''}
                readOnly
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</span>
              <input
                name="phone"
                className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                defaultValue={user?.phone ?? ''}
                required
              />
            </label>
            <button className="tap-target rounded-lg bg-ironman-red px-4 py-2 font-semibold text-white" type="submit">
              Save profile
            </button>
          </form>

          <hr className="my-6 border-ironman-navy-100" />

          <h3 className="text-lg font-bold text-ironman-navy">Change password</h3>
          <form className="mt-3 space-y-3" onSubmit={changePassword}>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                autoComplete="new-password"
                required
              />
            </label>
            <button
              type="submit"
              disabled={passwordSaving}
              className="tap-target rounded-lg bg-ironman-navy px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ironman-navy">Addresses</h2>
            <button
              type="button"
              onClick={openCreateAddress}
              className="tap-target rounded-lg bg-ironman-navy px-3 py-1.5 text-sm font-semibold text-white"
            >
              + Add address
            </button>
          </div>

          {addresses.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-ironman-navy-100 bg-ironman-navy-50 p-6 text-center text-sm text-gray-600">
              You don&apos;t have any saved addresses yet. Add one so pickups and deliveries are smoother.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {addresses.map((address) => (
                <li key={address.id} className="rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ironman-navy">
                        {address.label}
                        {address.defaultAddress ? (
                          <span className="ml-2 rounded-full bg-ironman-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {[address.addressLine1, address.addressLine2, address.area, address.city, address.postalCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!address.defaultAddress ? (
                        <button
                          type="button"
                          onClick={() => makeDefault(address)}
                          className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-navy hover:bg-white"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden /> Set default
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEditAddress(address)}
                        className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-navy hover:bg-white"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAddress(address)}
                        className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ironman-red hover:bg-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ironman-navy-100 px-5 py-3">
              <h3 className="text-lg font-bold text-ironman-navy">
                {addressDraft.id ? 'Edit address' : 'Add address'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Close"
                className="focus-ring rounded-full p-1 text-ironman-navy"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <form onSubmit={saveAddress} className="space-y-3 p-5">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Label</span>
                <input
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={addressDraft.label}
                  onChange={(e) => setAddressDraft((d) => ({ ...d, label: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Address line 1</span>
                <input
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={addressDraft.addressLine1}
                  onChange={(e) => setAddressDraft((d) => ({ ...d, addressLine1: e.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Address line 2 (optional)</span>
                <input
                  className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={addressDraft.addressLine2}
                  onChange={(e) => setAddressDraft((d) => ({ ...d, addressLine2: e.target.value }))}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Area</span>
                  <input
                    className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                    value={addressDraft.area}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, area: e.target.value }))}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">City</span>
                  <input
                    className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                    value={addressDraft.city}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                    required
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Postal code</span>
                  <input
                    className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                    value={addressDraft.postalCode}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, postalCode: e.target.value }))}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-ironman-navy">
                <input
                  type="checkbox"
                  checked={addressDraft.defaultAddress}
                  onChange={(e) => setAddressDraft((d) => ({ ...d, defaultAddress: e.target.checked }))}
                  className="h-4 w-4 accent-ironman-red"
                />
                Set as default address
              </label>
              <div className="flex items-center justify-end gap-2 border-t border-ironman-navy-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 text-sm font-semibold text-ironman-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="tap-target rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingAddress ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </RequireAuth>
  )
}
