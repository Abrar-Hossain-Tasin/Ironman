import Image from 'next/image'
import { QrCode, ShieldCheck } from 'lucide-react'
import { formatBdt } from '@/lib/utils'

type StaticQrPaymentProps = {
  amount: number
  orderNumber?: string
  compact?: boolean
}

export function StaticQrPayment({ amount, orderNumber, compact = false }: StaticQrPaymentProps) {
  return (
    <div className="rounded-lg border border-ironman-navy-100 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ironman-red text-white">
          <QrCode className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-bold text-ironman-navy">QR payment</h3>
          <p className="mt-1 text-sm text-gray-600">
            Scan the static IRONMAN payment QR and pay {formatBdt(Math.max(0, amount))}.
          </p>
        </div>
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? '' : 'sm:grid-cols-[180px_1fr]'}`}>
        <div className="mx-auto w-full max-w-[180px] rounded-lg border border-ironman-navy-100 bg-white p-3">
          <Image
            src="/payment-qr.svg"
            alt="IRONMAN Laundry static payment QR code"
            width={180}
            height={180}
            className="h-auto w-full"
            priority={compact}
          />
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="rounded-lg bg-ironman-navy-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount</p>
            <p className="mt-1 text-lg font-bold text-ironman-navy">{formatBdt(Math.max(0, amount))}</p>
          </div>
          {orderNumber ? (
            <div className="rounded-lg bg-ironman-navy-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reference</p>
              <p className="mt-1 font-semibold text-ironman-navy">{orderNumber}</p>
            </div>
          ) : null}
          <p className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Keep your transaction ID. Admin will verify the payment in the ledger.
          </p>
        </div>
      </div>
    </div>
  )
}
