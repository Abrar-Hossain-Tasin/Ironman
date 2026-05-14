import type { Metadata } from 'next'
import { LegalSection, LegalShell } from '@/components/layout/legal-shell'

export const metadata: Metadata = {
  title: 'Refund Policy · IRONMAN Laundry',
  description: 'When and how IRONMAN Laundry refunds payments and resolves item issues.'
}

export default function RefundPolicyPage() {
  return (
    <LegalShell
      title="Refund Policy"
      effectiveDate="1 January 2026"
      intro="We want every order to land right. This policy explains how we handle cancellations, missed pickups, damaged or lost items, and other situations that may warrant a refund or credit."
    >
      <LegalSection title="1. Cancellation refunds">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Before pickup</strong> — Cancellation is free. Any advance you have paid will be refunded in full to the
            original payment method, typically within 3–5 business days.
          </li>
          <li>
            <strong>After pickup</strong> — Self-service cancellation is unavailable. Please contact support; if no processing has
            begun, a full refund is usually still possible. Otherwise, a partial refund may apply for unprocessed items.
          </li>
          <li>
            <strong>Cancellation by us</strong> — If we cancel because of unavailable service or a pricing error, you receive a full
            refund without deduction.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Missed pickups and deliveries">
        <p>
          If we are unable to reach you on the scheduled day after two reasonable attempts, the order may be cancelled. Any advance
          paid is refunded in full. We may charge a small re-attempt fee if rescheduling is needed because of a no-show; this is
          shown to you in the app before you confirm a new slot.
        </p>
      </LegalSection>

      <LegalSection title="3. Damaged, lost, or wrong items">
        <p>
          Please raise an issue from your order page within <strong>48 hours</strong> of delivery. The faster you report, the easier
          it is to investigate.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Damaged or lost</strong> — If we are at fault, we refund the service charge for the affected item plus a
            depreciated-value reimbursement (see our Terms of Service for caps). Where possible, we will offer repair or replacement
            first.
          </li>
          <li>
            <strong>Wrong item</strong> — We arrange a free pickup and re-delivery of the correct item, and credit the service
            charge for the affected items.
          </li>
          <li>
            <strong>Late delivery</strong> — If we miss the scheduled window by a significant margin without notifying you, we apply
            a service-credit on your next order.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How refunds are paid">
        <p>
          Refunds are returned to the original payment method. Cash-on-delivery refunds are paid out via bKash to the registered
          mobile number on your account, unless you ask us to use a different supported method. Online refunds typically reflect in
          3–5 business days, depending on your bank or wallet.
        </p>
      </LegalSection>

      <LegalSection title="5. Service credits">
        <p>
          For minor service issues, we may offer a service credit instead of a cash refund. Credits are valid for 90 days, apply to
          a single future order, and cannot be redeemed for cash.
        </p>
      </LegalSection>

      <LegalSection title="6. Items we cannot accept liability for">
        <ul className="list-disc space-y-2 pl-5">
          <li>Pre-existing damage that was visible at pickup and noted by the delivery person.</li>
          <li>Normal wear, color fade on items not labelled colorfast, or loose embellishments.</li>
          <li>Items left in pockets, including cash, jewellery, and electronics.</li>
          <li>Garments with missing or illegible care labels processed in good faith using the most appropriate method.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. How to raise a refund request">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open the affected order from your account.</li>
          <li>Use “Report an issue” to describe what happened. Attach photos if you can — they speed up resolution.</li>
          <li>
            We will respond within <strong>2 business days</strong> with next steps. Most cases are closed within 5 business days.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="8. Escalation">
        <p>
          If you are not satisfied with the outcome, write to{' '}
          <a className="text-ironman-red underline" href="mailto:support@ironman.local">support@ironman.local</a> referencing your
          order number. A senior team member will personally re-examine the case and reply within 5 business days.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
