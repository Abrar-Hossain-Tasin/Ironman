import { CheckCircle2 } from 'lucide-react'

type HandshakeRowProps = {
  label: string
  done: boolean
  subtitle: string
}

/** One side of the two-step COD payment handshake (customer + delivery agent). */
export function HandshakeRow({ label, done, subtitle }: HandshakeRowProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 ${
        done ? 'border-emerald-200 bg-emerald-50' : 'border-ironman-navy-100 bg-ironman-navy-50'
      }`}
    >
      <span
        className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-white ${
          done ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold text-ironman-navy">{label}</p>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>
    </div>
  )
}
