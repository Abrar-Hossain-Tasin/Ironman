import type { Metadata } from 'next'
import { LegalSection, LegalShell } from '@/components/layout/legal-shell'

export const metadata: Metadata = {
  title: 'Terms of Service · IRONMAN Laundry',
  description: 'The terms that govern your use of IRONMAN Laundry services.'
}

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      effectiveDate="1 January 2026"
      intro="These Terms of Service (the “Terms”) are a binding agreement between you and IRONMAN Laundry (“we”, “us”, “our”). By creating an account or placing an order, you confirm that you have read, understood, and agree to be bound by these Terms."
    >
      <LegalSection title="1. Eligibility">
        <p>
          You must be at least 18 years old and capable of forming a legally binding contract to use our services. By using IRONMAN
          Laundry, you represent that the information you provide is accurate and that you are using the service for personal,
          non-commercial purposes unless we have agreed otherwise in writing.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <p>
          You are responsible for safeguarding your login credentials and for all activity that occurs under your account. Notify us
          immediately at <a className="text-ironman-red underline" href="mailto:support@ironman.local">support@ironman.local</a> if
          you suspect any unauthorized access. We may suspend or terminate an account that we reasonably believe has been used in
          breach of these Terms.
        </p>
      </LegalSection>

      <LegalSection title="3. Orders and pricing">
        <p>
          Prices shown in the app are quoted in Bangladeshi Taka (BDT) and are inclusive of applicable taxes unless stated otherwise.
          The final invoice is calculated based on the actual count and weight of items at our facility. If there is a meaningful
          difference between the quoted and final amount, we will contact you for confirmation before processing.
        </p>
        <p>
          We reserve the right to refuse or cancel any order — for example, if pricing has been incorrectly listed, if the requested
          service is not available in your area, or if we reasonably suspect fraud. In such cases, any amounts paid will be refunded
          in full to the original payment method.
        </p>
      </LegalSection>

      <LegalSection title="4. Pickup, processing, and delivery">
        <p>
          Pickup and delivery windows are estimates. While we work hard to honor scheduled slots, factors outside our control —
          including weather, traffic, and address access — may cause delays. If we are unable to attempt pickup or delivery after
          two reasonable tries, the order may be cancelled and any advance refunded, net of any work already performed.
        </p>
        <p>
          You agree to make items available in a reasonable, sortable condition. Please remove valuables, cash, jewellery, and
          electronics from pockets before handover. We are not responsible for items left in pockets or for damage caused by
          undeclared items (for example, a pen left in a shirt pocket).
        </p>
      </LegalSection>

      <LegalSection title="5. Care and liability">
        <p>
          We treat your items with reasonable care and follow the care instructions on garment labels. If a care label is missing,
          illegible, or contradictory, we will use the cleaning method we judge to be most appropriate.
        </p>
        <p>
          Where an item is lost or damaged due to our fault, our maximum aggregate liability per affected item is capped at the
          lesser of (a) the depreciated market value of the item, or (b) ten (10) times the service charge paid for that item. We do
          not accept liability for normal wear, pre-existing damage, color fastness failure on items not labelled colorfast, or
          loose embellishments (buttons, beads, sequins).
        </p>
      </LegalSection>

      <LegalSection title="6. Payments">
        <p>
          You may pay via cash on delivery, bKash, Nagad, Rocket, or supported card networks. All cash handovers require
          confirmation in-app by both you and the delivery person. Online payment partners may apply their own terms and fees; we
          are not a party to those agreements.
        </p>
      </LegalSection>

      <LegalSection title="7. Cancellation and refunds">
        <p>
          Cancellation is free until our delivery person arrives at your pickup location. After pickup, please contact support to
          discuss your options. Refunds are governed by our{' '}
          <a className="text-ironman-red underline" href="/legal/refund-policy">Refund Policy</a>.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <p>
          You agree not to use the service to (i) submit items prohibited by law, (ii) attempt to defraud us or other customers,
          (iii) reverse-engineer the platform, or (iv) interfere with the platform’s normal operation. Violations may result in
          immediate suspension and, where appropriate, referral to law enforcement.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual property">
        <p>
          The IRONMAN name, logo, design system, and software are our property and are protected by copyright, trademark, and other
          laws. You receive a limited, revocable, non-transferable licence to use the service for its intended purpose. No other
          rights are granted.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to the service or to these Terms">
        <p>
          We may update the service and these Terms from time to time. If a change materially affects your rights, we will provide
          reasonable notice via the app or by email. Continued use after the effective date of an update means you accept the
          updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Governing law and disputes">
        <p>
          These Terms are governed by the laws of the People’s Republic of Bangladesh. The courts located in Dhaka have exclusive
          jurisdiction over any dispute that cannot be resolved through good-faith negotiation.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          IRONMAN Laundry, Dhaka, Bangladesh.{' '}
          <a className="text-ironman-red underline" href="mailto:support@ironman.local">support@ironman.local</a>{' '}
          · +880 1700-000000.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
