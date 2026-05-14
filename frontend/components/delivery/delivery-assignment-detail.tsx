'use client'

import { FormEvent, useEffect, useState } from 'react'
import { MapPin, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'
import { DetailSkeleton } from '@/components/ui/skeleton'
import { AssignmentCard } from '@/components/tasks/assignment-card'
import { CompleteAssignmentPanel } from '@/components/tasks/complete-assignment-panel'
import { DeliveryCodReceivePanel } from '@/components/delivery/delivery-cod-receive-panel'
import { DeliveryFailPanel } from '@/components/delivery/delivery-fail-panel'
import { DeliveryReconcilePanel } from '@/components/delivery/delivery-reconcile-panel'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatBdt } from '@/lib/utils'
import type { Assignment } from '@/types'

type DeliveryAssignmentDetailProps = {
  id: string
}

export function DeliveryAssignmentDetail({ id }: DeliveryAssignmentDetailProps) {
  const token = useAuthStore((state) => state.accessToken)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!token) return
    const assignments = await apiFetch<Assignment[]>('/delivery/assignments', { token })
    setAssignment(assignments.find((item) => item.id === id) ?? null)
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load assignment'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  useEffect(() => {
    if (message) toast.success(message)
  }, [message])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  async function recordCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !assignment) return
    const form = new FormData(event.currentTarget)
    await apiFetch('/delivery/payments', {
      method: 'POST',
      token,
      body: {
        orderId: assignment.orderId,
        amount: Number(form.get('amount') ?? 0),
        paymentType: assignment.assignmentType === 'pickup' ? 'cod_pickup' : 'cod_delivery',
        payerPhone: String(form.get('payerPhone') ?? ''),
        paymentReference: String(form.get('paymentReference') ?? ''),
        notes: String(form.get('notes') ?? '')
      }
    })
    setMessage('Cash received and order paid amount updated')
    event.currentTarget.reset()
    await load()
  }

  async function action(nextAssignment: Assignment, path: 'accept' | 'start') {
    if (!token) return
    await apiFetch(`/delivery/assignments/${nextAssignment.id}/${path}`, {
      method: 'PUT',
      token
    })
    setMessage(`${nextAssignment.orderNumber} ${path}`)
    await load()
  }

  function focusCompletePanel() {
    const panel = document.getElementById('complete-assignment-panel')
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
      panel.querySelector<HTMLTextAreaElement>('textarea')?.focus()
    }
  }

  return (
    <RequireAuth roles={['delivery_man']}>
      {assignment ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <AssignmentCard
              assignment={assignment}
              onAccept={(item) => action(item, 'accept')}
              onStart={(item) => action(item, 'start')}
              onComplete={focusCompletePanel}
            />

            {assignment.assignmentType === 'pickup' ? (
              <DeliveryReconcilePanel assignment={assignment} token={token} onReconciled={load} />
            ) : null}

            {assignment.assignmentType === 'delivery' ? (
              <DeliveryCodReceivePanel assignment={assignment} token={token} onConfirmed={load} />
            ) : null}

            {assignment.assignmentType === 'delivery' ? (
              <DeliveryFailPanel
                assignment={assignment}
                token={token}
                onFailed={() => {
                  setMessage(`${assignment.orderNumber} marked as failed delivery`)
                  void load()
                }}
              />
            ) : null}

            <div id="complete-assignment-panel">
              <CompleteAssignmentPanel
                assignment={assignment}
                token={token}
                endpointBase="/delivery"
                onCompleted={() => {
                  setMessage(`${assignment.orderNumber} marked complete`)
                  void load()
                }}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <a
              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(assignment.address ?? '')}`}
              target="_blank"
              rel="noreferrer"
              className="tap-target focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-ironman-navy px-4 py-3 font-semibold text-white"
            >
              <MapPin className="h-5 w-5" aria-hidden />
              Open Map
            </a>

            {assignment.amountDue && assignment.amountDue > 0 ? (
              <form className="rounded-lg border border-ironman-navy-100 bg-white p-5 shadow-soft" onSubmit={recordCash}>
                <h2 className="flex items-center gap-2 text-lg font-bold text-ironman-navy">
                  <WalletCards className="h-5 w-5 text-ironman-red" aria-hidden />
                  Direct payment
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Records cash actually changed hands. Due: {formatBdt(Number(assignment.amountDue ?? 0))}
                </p>
                <input
                  name="amount"
                  className="tap-target mt-4 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  placeholder="Amount received"
                  type="number"
                  min="1"
                  max={assignment.amountDue ?? undefined}
                  defaultValue={assignment.amountDue ?? ''}
                  required
                />
                <input
                  name="payerPhone"
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  placeholder="Customer phone or bKash number"
                />
                <input
                  name="paymentReference"
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  placeholder="Optional receipt/reference"
                />
                <input
                  name="notes"
                  className="tap-target mt-3 w-full rounded-lg border border-ironman-navy-100 bg-ironman-navy-50 px-3 py-2 focus-ring"
                  placeholder="Notes"
                />
                <button
                  className="tap-target focus-ring mt-3 w-full rounded-lg bg-ironman-red px-4 py-3 font-semibold text-white"
                  type="submit"
                >
                  Record cash received
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  Use this for any cash you took in hand. The two-step handshake above is a separate confirmation that
                  closes the COD audit trail.
                </p>
              </form>
            ) : null}
          </aside>
        </div>
      ) : (
        <DetailSkeleton />
      )}
    </RequireAuth>
  )
}
