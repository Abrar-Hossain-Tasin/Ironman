import { Check, Clock3 } from 'lucide-react'
import { paymentCollectorName } from '@/lib/mappers'
import { formatBdt, statusLabel } from '@/lib/utils'
import type { PaymentLedgerRow } from '@/types'

type PaymentLedgerProps = {
  payments: PaymentLedgerRow[]
  onVerify?: (payment: PaymentLedgerRow) => void
}

export function PaymentLedger({ payments, onVerify }: PaymentLedgerProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ironman-navy-100 bg-white shadow-soft">
      <table className="min-w-[1020px] w-full text-sm">
        <thead className="bg-ironman-navy text-white">
          <tr>
            <th className="px-4 py-4 text-left">Order</th>
            <th className="px-4 py-4 text-left">Collected By</th>
            <th className="px-4 py-4 text-left">Amount</th>
            <th className="px-4 py-4 text-left">Type</th>
            <th className="px-4 py-4 text-left">Reference</th>
            <th className="px-4 py-4 text-left">Verified</th>
            <th className="px-4 py-4 text-left">Settlement</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, index) => (
            <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-ironman-navy-50'}>
              <td className="px-4 py-4 font-semibold text-ironman-navy">{payment.orderNumber}</td>
              <td className="px-4 py-4">{paymentCollectorName(payment)}</td>
              <td className="px-4 py-4 font-semibold text-ironman-navy">{formatBdt(payment.amount)}</td>
              <td className="px-4 py-4">{statusLabel(payment.paymentType as never)}</td>
              <td className="px-4 py-4">
                <span className="block font-semibold text-ironman-navy">{payment.paymentReference ?? '-'}</span>
                {payment.payerPhone ? <span className="block text-xs text-gray-500">{payment.payerPhone}</span> : null}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-ironman-navy">
                  {payment.verified ? <Check className="h-4 w-4 text-green-700" /> : <Clock3 className="h-4 w-4 text-ironman-red" />}
                  {payment.verified ? 'Verified' : 'Pending'}
                </span>
                {!payment.verified && onVerify ? (
                  <button className="tap-target focus-ring ml-3 rounded-lg bg-ironman-navy px-3 py-1 text-xs font-semibold text-white" type="button" onClick={() => onVerify(payment)}>
                    Verify
                  </button>
                ) : null}
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-ironman-navy">
                  {payment.appliedToBalance ? <Check className="h-4 w-4 text-green-700" /> : <Clock3 className="h-4 w-4 text-ironman-red" />}
                  {payment.appliedToBalance ? 'Applied' : 'Held'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
