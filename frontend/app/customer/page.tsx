import { redirect } from 'next/navigation'

export default function CustomerRedirectPage() {
  redirect('/customer/dashboard')
}
