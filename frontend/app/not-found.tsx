import Link from 'next/link'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-xl border border-ironman-navy-100 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-ironman-navy-50 text-ironman-navy">
          <Compass className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-ironman-navy">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="focus-ring inline-flex items-center rounded-lg bg-ironman-red px-4 py-2 text-sm font-bold text-white shadow-glow hover:bg-ironman-red-dark"
          >
            Back to home
          </Link>
          <Link
            href="/track"
            className="focus-ring inline-flex items-center rounded-lg border border-ironman-navy-100 px-4 py-2 text-sm font-bold text-ironman-navy hover:bg-ironman-navy-50"
          >
            Track an order
          </Link>
        </div>
      </div>
    </main>
  )
}
