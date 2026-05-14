import { redirect } from 'next/navigation'

export default function WorkerRedirectPage() {
  redirect('/worker/dashboard')
}
