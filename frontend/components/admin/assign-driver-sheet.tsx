'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Truck } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useAdminStaff, useAssignOrder } from '@/components/admin/hooks/use-admin-assignments'
import { cn } from '@/lib/utils'
import type { OrderResponse } from '@/types'

type Props = {
  order: OrderResponse | null
  /** Assignment kind. Defaults to "pickup" when the order is pre-pickup and
   *  "delivery" otherwise — caller can override. */
  defaultType?: 'pickup' | 'delivery'
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DRIVER_ROLE = 'delivery_man'

function inferType(order: OrderResponse | null, override?: Props['defaultType']) {
  if (override) return override
  if (!order) return 'pickup' as const
  const preDispatch: OrderResponse['status'][] = [
    'pending',
    'confirmed',
    'pickup_assigned'
  ]
  return preDispatch.includes(order.status) ? ('pickup' as const) : ('delivery' as const)
}

export function AssignDriverSheet({ order, defaultType, open, onOpenChange }: Props) {
  const assignmentType = inferType(order, defaultType)
  const staff = useAdminStaff(DRIVER_ROLE)
  const assign = useAssignOrder()
  const [selected, setSelected] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  function reset() {
    setSelected(null)
    setNotes('')
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!order || !selected) return
    assign.mutate(
      { orderId: order.id, assignmentType, assignedToId: selected, notes: notes || null },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        }
      }
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-ironman-red" aria-hidden />
            <SheetTitle>Assign driver</SheetTitle>
          </div>
          <SheetDescription>
            {order ? (
              <>
                Order <span className="font-semibold text-ironman-navy">{order.orderNumber}</span> ·{' '}
                {assignmentType === 'pickup' ? 'Pickup' : 'Delivery'} ·{' '}
                {order.customer.fullName}
              </>
            ) : (
              'Pick an order to assign.'
            )}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ironman-navy/70">
              Available drivers
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              Tap to select. Driver workload is shown next to each name.
            </p>
            <div className="mt-3 space-y-1">
              {staff.isLoading ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading drivers…
                </div>
              ) : staff.data && staff.data.length > 0 ? (
                staff.data.map((driver) => {
                  const active = selected === driver.id
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => setSelected(driver.id)}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                        active
                          ? 'border-ironman-red bg-ironman-red-50/60 text-ironman-navy'
                          : 'border-ironman-navy-100 bg-white hover:bg-ironman-navy-50'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ironman-navy">
                            {driver.fullName}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">{driver.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={driver.active ? 'emerald' : 'slate'}>
                            {driver.active ? 'Available' : 'Off duty'}
                          </Badge>
                          {active ? (
                            <CheckCircle2 className="h-4 w-4 text-ironman-red" aria-hidden />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <p className="rounded-lg bg-ironman-navy-50/60 px-3 py-3 text-xs text-gray-600">
                  No delivery drivers configured yet.
                </p>
              )}
            </div>

            <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-ironman-navy/70">
              Notes (optional)
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Special handling, building entry, fragile items…"
                className="mt-1 w-full rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-sm font-normal text-ironman-navy focus-ring"
              />
            </label>
          </div>

          <SheetFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-lg border border-ironman-navy-100 bg-white px-3 py-2 text-xs font-bold text-ironman-navy hover:bg-ironman-navy-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selected || assign.isPending}
              className="focus-ring inline-flex items-center gap-1 rounded-lg bg-ironman-red px-3 py-2 text-xs font-bold text-white shadow-glow hover:bg-ironman-red-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {assign.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Truck className="h-3 w-3" aria-hidden />
              )}
              Assign driver
            </button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
