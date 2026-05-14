'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  CalendarClock,
  Check,
  ClipboardCheck,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  ShoppingBag,
  X
} from 'lucide-react'
import { RequireAuth } from '@/components/auth/require-auth'
import { AddressMapPicker, type AddressMapValue } from '@/components/customer/address-map-picker'
import { apiFetch, endpoints, ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { decorateClothingTypes } from '@/lib/catalog'
import { formatBdt, isoDate } from '@/lib/utils'
import type {
  AddressResponse,
  ClothingType,
  CouponResponse,
  OrderResponse,
  PaymentMethod,
  PricingCell,
  QuoteResponse,
  ServiceCategory,
  SlotAvailabilityResponse
} from '@/types'

type QuantityMap = Record<string, number>

const steps = [
  { id: 1, label: 'Pickup', icon: MapPin },
  { id: 2, label: 'Delivery', icon: MapPin },
  { id: 3, label: 'Items', icon: ShoppingBag },
  { id: 4, label: 'Schedule', icon: CalendarClock },
  { id: 5, label: 'Review', icon: ClipboardCheck }
] as const

type PaymentOption = {
  id: PaymentMethod
  title: string
  body: string
  icon: typeof CreditCard
}

// Only the payment methods with a working settlement path are exposed. nagad /
// rocket / card live in the enum but have no settlement endpoint wired yet —
// surfacing them would create orders no one can ever pay for.
const paymentOptions: PaymentOption[] = [
  {
    id: 'cod',
    title: 'Cash on delivery',
    body: 'Pay the delivery man in cash at handover. Both you and the delivery man confirm payment in-app.',
    icon: CreditCard
  },
  {
    id: 'bkash',
    title: 'bKash merchant',
    body: 'Scan our merchant QR after pickup and submit the bKash transaction ID from your order page.',
    icon: QrCode
  }
]


const CART_STORAGE_KEY = 'ironman-cart-draft'

type CartDraft = {
  quantities: QuantityMap
  notes: Record<string, string>
  pickupAddressId: string
  deliveryAddressId: string
  pickupDate: string
  deliveryDate: string
  pickupSlot: string
  deliverySlot: string
  paymentMethod: PaymentMethod
  specialInstructions: string
  appliedCoupon: string | null
  sameAsPickup: boolean
}

function readCartDraft(): Partial<CartDraft> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<CartDraft>
  } catch {
    return {}
  }
}

export function OrderWizard({ reorderOrderId }: { reorderOrderId?: string }) {
  const router = useRouter()
  const token = useAuthStore((state) => state.accessToken)
  const reorderAppliedRef = useRef(false)
  const draftRef = useRef<Partial<CartDraft>>({})
  if (typeof window !== 'undefined' && !Object.keys(draftRef.current).length) {
    draftRef.current = readCartDraft()
  }
  const initial = draftRef.current

  const [step, setStep] = useState(1)
  const [quantities, setQuantities] = useState<QuantityMap>(initial.quantities ?? {})
  const [notes, setNotes] = useState<Record<string, string>>(initial.notes ?? {})
  const [addresses, setAddresses] = useState<AddressResponse[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([])
  const [pricing, setPricing] = useState<PricingCell[]>([])
  const [pickupAddressId, setPickupAddressId] = useState(initial.pickupAddressId ?? '')
  const [deliveryAddressId, setDeliveryAddressId] = useState(initial.deliveryAddressId ?? '')
  const [pickupDate, setPickupDate] = useState(initial.pickupDate ?? isoDate(1))
  const [deliveryDate, setDeliveryDate] = useState(initial.deliveryDate ?? isoDate(3))
  const [pickupSlot, setPickupSlot] = useState(initial.pickupSlot ?? '10:00-12:00')
  const [deliverySlot, setDeliverySlot] = useState(initial.deliverySlot ?? '14:00-18:00')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial.paymentMethod ?? 'cod')
  const [specialInstructions, setSpecialInstructions] = useState(initial.specialInstructions ?? '')
  const [sameAsPickup, setSameAsPickup] = useState<boolean>(initial.sameAsPickup ?? true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // New-address dialog state (with map pin)
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [addressForm, setAddressForm] = useState<NewAddressForm>({
    label: 'Home',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: 'Dhaka',
    postalCode: '',
    latitude: null,
    longitude: null,
    defaultAddress: false
  })
  const [savingAddress, setSavingAddress] = useState(false)

  // Coupon & quote state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(initial.appliedCoupon ?? null)
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const quoteSeq = useRef(0)

  // Server-driven slot capacity. Each step-4 date change refetches; we never
  // show a slot that's full and we surface remaining capacity to the user.
  const [pickupSlots, setPickupSlots] = useState<SlotAvailabilityResponse | null>(null)
  const [deliverySlots, setDeliverySlots] = useState<SlotAvailabilityResponse | null>(null)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  // Coupons available for discovery — admins curate descriptions; only
  // discoverable ones come back. We do not auto-apply any of them.
  const [availableCoupons, setAvailableCoupons] = useState<CouponResponse[]>([])
  const [couponsExpanded, setCouponsExpanded] = useState(false)

  // Persist the in-progress cart to localStorage so a refresh doesn't kill the
  // funnel. Server-side validation still runs at place-order time, so a stale
  // draft can only ever be a friendly inconvenience, never a correctness issue.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft: CartDraft = {
      quantities,
      notes,
      pickupAddressId,
      deliveryAddressId,
      pickupDate,
      deliveryDate,
      pickupSlot,
      deliverySlot,
      paymentMethod,
      specialInstructions,
      appliedCoupon,
      sameAsPickup
    }
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Quota exceeded or private mode — degrade silently.
    }
  }, [
    quantities,
    notes,
    pickupAddressId,
    deliveryAddressId,
    pickupDate,
    deliveryDate,
    pickupSlot,
    deliverySlot,
    paymentMethod,
    specialInstructions,
    appliedCoupon,
    sameAsPickup
  ])

  // Keep delivery == pickup whenever the toggle is on.
  useEffect(() => {
    if (sameAsPickup && pickupAddressId && deliveryAddressId !== pickupAddressId) {
      setDeliveryAddressId(pickupAddressId)
    }
  }, [sameAsPickup, pickupAddressId, deliveryAddressId])

  useEffect(() => {
    if (!token) return
    async function load() {
      try {
        const [nextAddresses, nextCategories, nextClothingTypes, nextPricing] = await Promise.all([
          apiFetch<AddressResponse[]>('/users/me/addresses', { token }),
          apiFetch<ServiceCategory[]>(endpoints.categories),
          apiFetch<ClothingType[]>(endpoints.clothingTypes),
          apiFetch<PricingCell[]>(endpoints.pricing)
        ])
        setAddresses(nextAddresses)
        setCategories(nextCategories)
        setClothingTypes(nextClothingTypes)
        setPricing(nextPricing)
        const defaultAddress = nextAddresses.find((address) => address.defaultAddress) ?? nextAddresses[0]
        if (defaultAddress) {
          setPickupAddressId(defaultAddress.id)
          setDeliveryAddressId(defaultAddress.id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load order data')
      }
    }

    void load()
  }, [token])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  useEffect(() => {
    if (!token || !reorderOrderId || reorderAppliedRef.current || !pricing.length) return
    let cancelled = false
    async function applyReorder() {
      try {
        const source = await apiFetch<OrderResponse>(`/orders/${reorderOrderId}`, { token })
        if (cancelled) return
        const nextQuantities: QuantityMap = {}
        const nextNotes: Record<string, string> = {}
        source.items.forEach((item) => {
          const priceCell = pricing.find((cell) =>
            cell.clothingTypeId === item.clothingTypeId
            && cell.serviceCategoryId === item.serviceCategoryId
          )
          if (!priceCell) return
          nextQuantities[priceCell.id] = item.quantity
          if (item.notes) nextNotes[item.clothingTypeId] = item.notes
        })
        setQuantities(nextQuantities)
        setNotes(nextNotes)
        setPickupAddressId(source.pickupAddress.id)
        setDeliveryAddressId(source.deliveryAddress.id)
        setSameAsPickup(source.pickupAddress.id === source.deliveryAddress.id)
        setPaymentMethod(source.paymentMethod)
        setSpecialInstructions(source.specialInstructions ?? '')
        setAppliedCoupon(null)
        setStep(3)
        reorderAppliedRef.current = true
        toast.success(`${source.orderNumber} copied. Review the schedule before placing again.`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not copy order')
      }
    }
    void applyReorder()
    return () => {
      cancelled = true
    }
  }, [pricing, reorderOrderId, token])

  // Curated coupons the customer can browse. One-shot at mount — cheap and
  // doesn't change inside a single ordering session.
  useEffect(() => {
    if (!token) return
    apiFetch<CouponResponse[]>('/coupons/active', { token })
      .then(setAvailableCoupons)
      .catch(() => setAvailableCoupons([]))
  }, [token])

  // Re-query pickup-slot capacity whenever the pickup date changes.
  useEffect(() => {
    if (!token || !pickupDate) {
      setPickupSlots(null)
      return
    }
    let cancelled = false
    apiFetch<SlotAvailabilityResponse>(`/services/slots?date=${pickupDate}`, { token })
      .then((res) => {
        if (cancelled) return
        setPickupSlots(res)
        setSlotsError(null)
        // If the currently-selected slot is full or no longer offered, push
        // the user to the first available alternative.
        const offered = res.pickup
        const current = offered.find((row) => row.slot === pickupSlot)
        if (!current || current.full) {
          const fallback = offered.find((row) => !row.full)
          if (fallback) setPickupSlot(fallback.slot)
        }
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err instanceof Error ? err.message : 'Could not load slots')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pickupDate])

  useEffect(() => {
    if (!token || !deliveryDate) {
      setDeliverySlots(null)
      return
    }
    let cancelled = false
    apiFetch<SlotAvailabilityResponse>(`/services/slots?date=${deliveryDate}`, { token })
      .then((res) => {
        if (cancelled) return
        setDeliverySlots(res)
        setSlotsError(null)
        const offered = res.delivery
        const current = offered.find((row) => row.slot === deliverySlot)
        if (!current || current.full) {
          const fallback = offered.find((row) => !row.full)
          if (fallback) setDeliverySlot(fallback.slot)
        }
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err instanceof Error ? err.message : 'Could not load slots')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deliveryDate])

  const decoratedClothingTypes = useMemo(() => decorateClothingTypes(clothingTypes), [clothingTypes])
  const selectedItems = useMemo(() => {
    return pricing
      .map((cell) => ({ ...cell, quantity: quantities[cell.id] ?? 0 }))
      .filter((cell) => cell.quantity > 0)
  }, [pricing, quantities])

  const localSubtotal = selectedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const pickupAddress = addresses.find((address) => address.id === pickupAddressId)
  const deliveryAddress = addresses.find((address) => address.id === deliveryAddressId)
  const blockedStep = firstInvalidStep()
  const readyToPlace = blockedStep === null
  const progressPercent = ((Math.max(step, highestAvailableStep()) - 1) / (steps.length - 1)) * 100

  // ── Server quote ───────────────────────────────────────────────────────
  // Re-quote whenever the cart or applied coupon changes. Debounced so
  // single-tap qty bumps don't fire one request per click.
  useEffect(() => {
    if (!token) return
    if (!selectedItems.length) {
      setQuote(null)
      setQuoteError(null)
      return
    }

    const seq = ++quoteSeq.current
    setQuoteLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await apiFetch<QuoteResponse>('/orders/quote', {
          method: 'POST',
          token,
          body: {
            items: selectedItems.map((item) => ({
              clothingTypeId: item.clothingTypeId,
              serviceCategoryId: item.serviceCategoryId,
              quantity: item.quantity,
              notes: ''
            })),
            couponCode: appliedCoupon ?? null
          }
        })
        if (seq !== quoteSeq.current) return
        setQuote(response)
        setQuoteError(null)
      } catch (err) {
        if (seq !== quoteSeq.current) return
        setQuote(null)
        const msg = err instanceof Error ? err.message : 'Could not refresh price'
        setQuoteError(msg)
      } finally {
        if (seq === quoteSeq.current) setQuoteLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [token, selectedItems, appliedCoupon])

  const discountAmount = Number(quote?.discountAmount ?? 0)
  const total = Number(quote?.total ?? localSubtotal)
  const appliedCode = quote?.appliedCouponCode ?? null

  function stepError(stepId: number) {
    if (stepId === 1) {
      if (!addresses.length) return 'Add a pickup address before continuing'
      if (!pickupAddressId || !pickupAddress) return 'Select a pickup address'
    }

    if (stepId === 2) {
      if (!addresses.length) return 'Add a delivery address before continuing'
      if (!deliveryAddressId || !deliveryAddress) return 'Select a delivery address'
    }

    if (stepId === 3) {
      if (!pricing.length) return 'Pricing is still loading. Try again in a moment'
      if (!selectedItems.length) return 'Add at least one laundry item'
    }

    if (stepId === 4) {
      const today = isoDate(0)
      if (!pickupDate) return 'Select a pickup date'
      if (!pickupSlot) return 'Select a pickup time slot'
      if (!deliveryDate) return 'Select a delivery date'
      if (!deliverySlot) return 'Select a delivery time slot'
      if (pickupDate < today) return 'Pickup date cannot be in the past'
      if (deliveryDate < pickupDate) return 'Delivery date cannot be before pickup date'
    }

    return null
  }

  function firstInvalidStep(limit = 4) {
    for (let index = 1; index <= limit; index += 1) {
      if (stepError(index)) return index
    }
    return null
  }

  function highestAvailableStep() {
    const invalid = firstInvalidStep()
    return invalid ?? steps.length
  }

  function goToStep(targetStep: number) {
    if (targetStep <= step) {
      setStep(targetStep)
      setError(null)
      return
    }

    const invalid = firstInvalidStep(targetStep - 1)
    if (invalid) {
      setStep(invalid)
      setError(stepError(invalid))
      return
    }

    setStep(targetStep)
    setError(null)
  }

  function nextStep() {
    const currentError = stepError(step)
    if (currentError) {
      setError(currentError)
      return
    }
    setStep((current) => Math.min(5, current + 1))
    setError(null)
  }

  function previousStep() {
    setStep((current) => Math.max(1, current - 1))
    setError(null)
  }

  function adjust(id: string, delta: number) {
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(0, (current[id] ?? 0) + delta)
    }))
  }

  function openAddressForm() {
    setAddressForm({
      label: addresses.length ? 'Other' : 'Home',
      addressLine1: '',
      addressLine2: '',
      area: '',
      city: 'Dhaka',
      postalCode: '',
      latitude: null,
      longitude: null,
      defaultAddress: addresses.length === 0
    })
    setAddressFormOpen(true)
    setError(null)
  }

  async function saveAddress() {
    if (!token) return
    if (!addressForm.addressLine1.trim() || !addressForm.area.trim() || !addressForm.city.trim()) {
      setError('Fill address line, area, and city')
      return
    }
    setSavingAddress(true)
    try {
      const saved = await apiFetch<AddressResponse>('/users/me/addresses', {
        method: 'POST',
        token,
        body: {
          label: addressForm.label.trim() || 'Home',
          addressLine1: addressForm.addressLine1.trim(),
          addressLine2: addressForm.addressLine2.trim() || null,
          area: addressForm.area.trim(),
          city: addressForm.city.trim(),
          postalCode: addressForm.postalCode.trim() || null,
          latitude: addressForm.latitude,
          longitude: addressForm.longitude,
          defaultAddress: addressForm.defaultAddress
        }
      })
      setAddresses((current) => [...current, saved])
      setPickupAddressId((current) => current || saved.id)
      setDeliveryAddressId((current) => current || saved.id)
      setAddressFormOpen(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save address')
    } finally {
      setSavingAddress(false)
    }
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setAppliedCoupon(code)
    setCouponInput('')
  }

  function clearCoupon() {
    setAppliedCoupon(null)
    setQuoteError(null)
  }

  async function placeOrder() {
    if (!token) return
    const invalid = firstInvalidStep()
    if (invalid) {
      setStep(invalid)
      setError(stepError(invalid))
      return
    }

    if (step !== 5) {
      setStep(5)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const order = await apiFetch<OrderResponse>('/orders', {
        method: 'POST',
        token,
        body: {
          pickupAddressId,
          deliveryAddressId,
          preferredPickupDate: pickupDate,
          preferredPickupTimeSlot: pickupSlot,
          preferredDeliveryDate: deliveryDate,
          preferredDeliveryTimeSlot: deliverySlot,
          specialInstructions,
          paymentMethod,
          couponCode: appliedCoupon ?? null,
          items: selectedItems.map((item) => ({
            clothingTypeId: item.clothingTypeId,
            serviceCategoryId: item.serviceCategoryId,
            quantity: item.quantity,
            notes: notes[item.clothingTypeId] ?? ''
          }))
        }
      })
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(CART_STORAGE_KEY)
        } catch {
          /* ignore */
        }
      }
      router.push(`/customer/orders/${order.id}`)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail || err.message : err instanceof Error ? err.message : 'Could not place order'
      setError(msg || 'Could not place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RequireAuth roles={['customer']}>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order progress</p>
                <h2 className="mt-1 text-xl font-bold text-ironman-navy">{steps[step - 1].label}</h2>
              </div>
              <span className="rounded-full bg-ironman-navy-50 px-3 py-1 text-sm font-semibold text-ironman-navy">
                Step {step} of {steps.length}
              </span>
            </div>

            <div className="relative mt-5">
              <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-ironman-navy-100" />
              <div className="absolute left-0 top-5 h-1 rounded-full bg-ironman-red transition-all" style={{ width: `${progressPercent}%` }} />
              <div className="relative grid grid-cols-5 gap-2">
                {steps.map(({ id, label, icon: Icon }) => {
                  const complete = id < step && !stepError(id)
                  const locked = id > highestAvailableStep()
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => goToStep(id)}
                      aria-current={step === id ? 'step' : undefined}
                      disabled={locked}
                      className="group flex min-w-0 flex-col items-center gap-2 text-center disabled:cursor-not-allowed"
                    >
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-bold transition ${
                          step === id
                            ? 'border-ironman-red bg-ironman-red text-white'
                            : complete
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : locked
                                ? 'border-ironman-navy-100 bg-white text-gray-400'
                                : 'border-ironman-navy-100 bg-white text-ironman-navy'
                        }`}
                      >
                        {complete ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                      </span>
                      <span className={`truncate text-xs font-semibold ${locked ? 'text-gray-400' : 'text-ironman-navy'}`}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {step === 1 ? (
            <AddressStep
              title="Pickup address"
              selectedId={pickupAddressId}
              addresses={addresses}
              onSelect={setPickupAddressId}
              onAdd={openAddressForm}
            />
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <label className="flex items-center gap-2 rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 text-sm font-semibold text-ironman-navy">
                <input
                  type="checkbox"
                  checked={sameAsPickup}
                  onChange={(event) => {
                    const next = event.target.checked
                    setSameAsPickup(next)
                    if (next && pickupAddressId) {
                      setDeliveryAddressId(pickupAddressId)
                    }
                  }}
                  className="h-4 w-4 accent-ironman-red"
                />
                Deliver to my pickup address
              </label>
              {sameAsPickup ? (
                <div className="rounded-lg border border-dashed border-ironman-navy-100 bg-white p-4 text-sm text-gray-600">
                  Delivery will go back to <strong className="text-ironman-navy">{pickupAddress ? pickupAddress.label : 'your pickup address'}</strong>.
                  Uncheck above to send to a different address.
                </div>
              ) : (
                <AddressStep
                  title="Delivery address"
                  selectedId={deliveryAddressId}
                  addresses={addresses}
                  onSelect={setDeliveryAddressId}
                  onAdd={openAddressForm}
                />
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              {decoratedClothingTypes.map((clothing) => (
                <article key={clothing.id} className="rounded-lg border border-ironman-navy-100 p-4">
                  <h2 className="text-lg font-bold text-ironman-navy">{clothing.name}</h2>
                  <div className="mt-4 divide-y divide-ironman-navy-100 rounded-lg border border-ironman-navy-100">
                    {categories.map((category) => {
                      const cell = pricing.find((item) => item.clothingTypeId === clothing.id && item.serviceCategoryId === category.id)
                      if (!cell) return null
                      const quantity = quantities[cell.id] ?? 0
                      return (
                        <div key={category.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3">
                          <div>
                            <p className="font-semibold text-ironman-navy">{category.name}</p>
                            <p className="text-sm text-gray-500">{formatBdt(Number(cell.price))} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="tap-target focus-ring rounded-lg border border-ironman-navy-100 p-2" type="button" onClick={() => adjust(cell.id, -1)} aria-label={`Decrease ${clothing.name} ${category.name}`}>
                              <Minus className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="w-8 text-center font-bold text-ironman-navy">{quantity}</span>
                            <button className="tap-target focus-ring rounded-lg bg-ironman-red p-2 text-white" type="button" onClick={() => adjust(cell.id, 1)} aria-label={`Increase ${clothing.name} ${category.name}`}>
                              <Plus className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="hidden w-24 text-right font-semibold text-ironman-navy sm:inline">{formatBdt(Number(cell.price) * quantity)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <input
                    className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                    placeholder="Notes"
                    value={notes[clothing.id] ?? ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [clothing.id]: event.target.value }))}
                  />
                </article>
              ))}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Pickup date</span>
                <input className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" type="date" min={isoDate(0)} value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
              </label>
              <label>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Pickup slot</span>
                <select
                  className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={pickupSlot}
                  onChange={(event) => setPickupSlot(event.target.value)}
                  disabled={!pickupSlots}
                >
                  {(pickupSlots?.pickup ?? []).length === 0 ? (
                    <option value="">Loading slots…</option>
                  ) : (
                    pickupSlots!.pickup.map((row) => (
                      <option key={row.slot} value={row.slot} disabled={row.full}>
                        {row.slot}
                        {row.full ? ' — Full' : row.remaining <= 3 ? ` — Only ${row.remaining} left` : ''}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Delivery date</span>
                <input className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" type="date" min={pickupDate || isoDate(0)} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
              </label>
              <label>
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Delivery slot</span>
                <select
                  className="tap-target mt-2 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  value={deliverySlot}
                  onChange={(event) => setDeliverySlot(event.target.value)}
                  disabled={!deliverySlots}
                >
                  {(deliverySlots?.delivery ?? []).length === 0 ? (
                    <option value="">Loading slots…</option>
                  ) : (
                    deliverySlots!.delivery.map((row) => (
                      <option key={row.slot} value={row.slot} disabled={row.full}>
                        {row.slot}
                        {row.full ? ' — Full' : row.remaining <= 3 ? ` — Only ${row.remaining} left` : ''}
                      </option>
                    ))
                  )}
                </select>
              </label>
              {slotsError ? (
                <p className="md:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  {slotsError} — using cached options.
                </p>
              ) : null}
              <label className="md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Special instructions</span>
                <textarea className="mt-2 min-h-24 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={specialInstructions} onChange={(event) => setSpecialInstructions(event.target.value)} />
              </label>
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              <h2 className="text-xl font-bold text-ironman-navy">Review order</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReviewBlock title="Pickup" value={pickupAddress ? addressText(pickupAddress) : 'Not selected'} onEdit={() => goToStep(1)} />
                <ReviewBlock title="Delivery" value={deliveryAddress ? addressText(deliveryAddress) : 'Not selected'} onEdit={() => goToStep(2)} />
                <ReviewBlock title="Pickup time" value={`${pickupDate} ${pickupSlot}`} onEdit={() => goToStep(4)} />
                <ReviewBlock title="Delivery time" value={`${deliveryDate} ${deliverySlot}`} onEdit={() => goToStep(4)} />
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payment method</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {paymentOptions.map((option) => (
                    <PaymentMethodButton
                      key={option.id}
                      active={paymentMethod === option.id}
                      icon={option.icon}
                      title={option.title}
                      body={option.body}
                      onClick={() => setPaymentMethod(option.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex justify-between rounded-lg bg-ironman-navy-50 px-3 py-2 text-sm">
                    <span>{item.quantity}x {item.clothingTypeName} {item.serviceCategoryName}</span>
                    <span className="font-semibold text-ironman-navy">{formatBdt(Number(item.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {specialInstructions ? <p className="mt-4 rounded-lg bg-ironman-navy-50 px-3 py-2 text-sm text-gray-700">{specialInstructions}</p> : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ironman-navy-100 pt-5">
            <button
              className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg border border-ironman-navy-100 px-4 py-2 font-semibold text-ironman-navy disabled:opacity-50"
              type="button"
              onClick={previousStep}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            {step < 5 ? (
              <button className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-5 py-2 font-semibold text-white" type="button" onClick={nextStep}>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button className="tap-target focus-ring inline-flex items-center gap-2 rounded-lg bg-ironman-red px-5 py-2 font-semibold text-white disabled:opacity-70" type="button" onClick={placeOrder} disabled={loading || !readyToPlace}>
                <PackageCheck className="h-4 w-4" aria-hidden />
                {loading ? 'Placing...' : 'Place order'}
              </button>
            )}
          </div>
        </section>

        <aside className="sticky bottom-0 top-20 h-fit rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ironman-navy">Order summary</h2>
          <div className="mt-4 space-y-2">
            {selectedItems.length ? selectedItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span>{item.quantity}x {item.clothingTypeName} {item.serviceCategoryName}</span>
                <span className="font-semibold text-ironman-navy">{formatBdt(Number(item.price) * item.quantity)}</span>
              </div>
            )) : <p className="text-sm text-gray-500">No items selected</p>}
          </div>

          {selectedItems.length ? (
            <div className="mt-4 space-y-2 border-t border-ironman-navy-100 pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatBdt(localSubtotal)}</span>
              </div>
              {appliedCode && discountAmount > 0 ? (
                <div className="flex items-center justify-between text-sm font-semibold text-emerald-700">
                  <span className="inline-flex items-center gap-1">
                    <BadgePercent className="h-3.5 w-3.5" aria-hidden />
                    {appliedCode}
                  </span>
                  <span>− {formatBdt(discountAmount)}</span>
                </div>
              ) : null}
              {quoteLoading ? (
                <p className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Refreshing total…
                </p>
              ) : null}
              {quoteError ? <p className="text-xs text-ironman-red">{quoteError}</p> : null}

              <div className="mt-3 rounded-lg bg-ironman-navy-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Promo / coupon</p>
                {appliedCoupon ? (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-ironman-navy">{appliedCoupon}</span>
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="text-xs font-semibold text-ironman-red focus-ring rounded"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="tap-target min-w-0 flex-1 rounded-md border border-ironman-navy-100 bg-white px-2 py-1.5 text-sm uppercase focus-ring"
                        placeholder="Code"
                        value={couponInput}
                        onChange={(event) => setCouponInput(event.target.value)}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={!couponInput.trim()}
                        className="tap-target rounded-md bg-ironman-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                    {availableCoupons.length > 0 ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setCouponsExpanded((v) => !v)}
                          className="focus-ring inline-flex items-center gap-1 text-xs font-semibold text-ironman-red hover:underline"
                        >
                          {couponsExpanded
                            ? 'Hide available offers'
                            : `Show ${availableCoupons.length} available offer${availableCoupons.length === 1 ? '' : 's'}`}
                        </button>
                        {couponsExpanded ? (
                          <ul className="mt-2 space-y-1.5">
                            {availableCoupons.map((coupon) => (
                              <li
                                key={coupon.id}
                                className="flex items-start justify-between gap-2 rounded-md border border-ironman-navy-100 bg-white p-2 text-xs"
                              >
                                <div>
                                  <p className="font-bold text-ironman-navy">{coupon.code}</p>
                                  {coupon.description ? (
                                    <p className="text-gray-600">{coupon.description}</p>
                                  ) : null}
                                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                                    {coupon.discountType === 'percent'
                                      ? `${coupon.discountValue}% off`
                                      : `${formatBdt(Number(coupon.discountValue))} off`}
                                    {coupon.minOrderAmount != null && Number(coupon.minOrderAmount) > 0
                                      ? ` · min ${formatBdt(Number(coupon.minOrderAmount))}`
                                      : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedCoupon(coupon.code)
                                    setCouponsExpanded(false)
                                  }}
                                  className="tap-target rounded-md bg-ironman-red px-2 py-1 text-[11px] font-semibold text-white"
                                >
                                  Apply
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-4 border-t border-ironman-navy-100 pt-4">
            <div className="flex justify-between text-xl font-bold text-ironman-navy">
              <span>Total</span>
              <span>{formatBdt(total)}</span>
            </div>
            {blockedStep ? (
              <button className="tap-target focus-ring mt-4 w-full rounded-lg bg-ironman-navy px-4 py-3 font-semibold text-white" type="button" onClick={() => goToStep(blockedStep)}>
                Complete {steps[blockedStep - 1].label}
              </button>
            ) : (
              <button className="tap-target focus-ring mt-4 w-full rounded-lg bg-ironman-red px-4 py-3 font-semibold text-white disabled:opacity-70" type="button" onClick={() => goToStep(5)} disabled={step === 5}>
                Review order
              </button>
            )}
          </div>
        </aside>
      </div>

      {addressFormOpen ? (
        <AddressFormModal
          form={addressForm}
          onChange={setAddressForm}
          onClose={() => setAddressFormOpen(false)}
          onSubmit={saveAddress}
          submitting={savingAddress}
        />
      ) : null}
    </RequireAuth>
  )
}

type NewAddressForm = {
  label: string
  addressLine1: string
  addressLine2: string
  area: string
  city: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  defaultAddress: boolean
}

type AddressStepProps = {
  title: string
  selectedId: string
  addresses: AddressResponse[]
  onSelect: (id: string) => void
  onAdd: () => void
}

function AddressStep({ title, selectedId, addresses, onSelect, onAdd }: AddressStepProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ironman-navy">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="tap-target focus-ring inline-flex items-center gap-1 rounded-lg bg-ironman-navy px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add new
        </button>
      </div>
      {addresses.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {addresses.map((address) => {
            const selected = selectedId === address.id
            return (
              <button
                key={address.id}
                type="button"
                onClick={() => onSelect(address.id)}
                className={`focus-ring rounded-lg border p-4 text-left ${selected ? 'border-ironman-red bg-ironman-red-50' : 'border-ironman-navy-100 bg-white'}`}
              >
                <p className="font-bold text-ironman-navy">{address.label}</p>
                <p className="mt-2 text-sm text-gray-600">{addressText(address)}</p>
                {address.latitude != null && address.longitude != null ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3 text-ironman-red" aria-hidden />
                    Pinned on map
                  </p>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-ironman-navy-100 bg-ironman-navy-50 p-6 text-center text-sm text-gray-600">
          You don&apos;t have any saved addresses yet. Tap <strong>Add new</strong> to pin one on the map.
        </p>
      )}
    </div>
  )
}

function AddressFormModal({
  form,
  onChange,
  onClose,
  onSubmit,
  submitting
}: {
  form: NewAddressForm
  onChange: (next: NewAddressForm) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const setField = <K extends keyof NewAddressForm>(key: K, value: NewAddressForm[K]) => onChange({ ...form, [key]: value })

  const handleMapChange = (next: AddressMapValue) => {
    onChange({
      ...form,
      latitude: next.latitude,
      longitude: next.longitude,
      addressLine1: form.addressLine1 || (next.resolvedAddress ?? '')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ironman-navy-100 px-5 py-3">
          <h3 className="text-lg font-bold text-ironman-navy">Add a new address</h3>
          <button type="button" onClick={onClose} className="focus-ring rounded-full p-1 text-ironman-navy">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Label</span>
              <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={form.label} onChange={(e) => setField('label', e.target.value)} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Address line 1</span>
              <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Address line 2 (optional)</span>
              <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={form.addressLine2} onChange={(e) => setField('addressLine2', e.target.value)} />
            </label>
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Area</span>
              <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={form.area} onChange={(e) => setField('area', e.target.value)} />
            </label>
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">City</span>
              <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={form.city} onChange={(e) => setField('city', e.target.value)} />
            </label>
            <label>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Postal code</span>
              <input className="tap-target mt-1 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ironman-navy">
              <input type="checkbox" checked={form.defaultAddress} onChange={(e) => setField('defaultAddress', e.target.checked)} />
              Set as default address
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Drop the pin</p>
            <p className="mb-2 text-xs text-gray-500">Helps the delivery man find your exact gate.</p>
            <AddressMapPicker
              value={{ latitude: form.latitude, longitude: form.longitude, resolvedAddress: null }}
              onChange={handleMapChange}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-ironman-navy-100 bg-ironman-navy-50 px-5 py-3">
          <button type="button" onClick={onClose} className="tap-target rounded-lg border border-ironman-navy-100 bg-white px-4 py-2 text-sm font-semibold text-ironman-navy">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="tap-target rounded-lg bg-ironman-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {submitting ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReviewBlock({ title, value, onEdit }: { title: string; value: string; onEdit: () => void }) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-sm font-semibold text-ironman-navy">{value}</p>
        </div>
        <button className="tap-target focus-ring rounded-lg border border-ironman-navy-100 px-3 py-1 text-sm font-semibold text-ironman-navy" type="button" onClick={onEdit}>
          Edit
        </button>
      </div>
    </div>
  )
}

function PaymentMethodButton({
  active,
  icon: Icon,
  title,
  body,
  onClick
}: {
  active: boolean
  icon: typeof CreditCard
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-lg border p-4 text-left transition ${
        active ? 'border-ironman-red bg-ironman-red-50' : 'border-ironman-navy-100 bg-white'
      }`}
    >
      <span className="flex items-center gap-2 font-bold text-ironman-navy">
        <Icon className="h-5 w-5 text-ironman-red" aria-hidden />
        {title}
      </span>
      <span className="mt-2 block text-sm text-gray-600">{body}</span>
    </button>
  )
}

function addressText(address: AddressResponse) {
  return [address.addressLine1, address.addressLine2, address.area, address.city, address.postalCode]
    .filter(Boolean)
    .join(', ')
}
