import Link from 'next/link'

export const metadata = {
  title: 'Offline - IRONMAN Laundry'
}

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ironman-navy-50 px-4 py-12">
      <section className="w-full max-w-md rounded-lg border border-ironman-navy-100 bg-white p-6 text-center shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-ironman-red">Offline mode</p>
        <h1 className="mt-3 text-2xl font-bold text-ironman-navy">Connection is flaky</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Delivery tasks and pages you opened recently may still be available. Reconnect to sync fresh assignments, payments, and GPS.
        </p>
        <Link
          href="/delivery/dashboard"
          className="tap-target focus-ring mt-5 inline-flex items-center justify-center rounded-lg bg-ironman-red px-5 py-3 text-sm font-semibold text-white"
        >
          Delivery dashboard
        </Link>
      </section>
    </main>
  )
}
