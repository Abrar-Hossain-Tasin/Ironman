import type { Metadata } from 'next'
import { LegalSection, LegalShell } from '@/components/layout/legal-shell'

export const metadata: Metadata = {
  title: 'Privacy Policy · IRONMAN Laundry',
  description: 'How IRONMAN Laundry collects, uses, and protects your personal information.'
}

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      effectiveDate="1 January 2026"
      intro="This Privacy Policy describes what personal information IRONMAN Laundry collects, why we collect it, how we use it, and the choices you have. We aim to be plain-spoken: keep what we need to run the service, ask before doing more, and never sell your data."
    >
      <LegalSection title="1. Information we collect">
        <p>We collect three categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information</strong> — your name, email, phone number, password (stored as a hash), and profile photo
            when you create an account.
          </li>
          <li>
            <strong>Order and address information</strong> — the addresses you save, pickup and delivery coordinates, items in each
            order, special instructions, and the receipts and invoices we generate.
          </li>
          <li>
            <strong>Operational data</strong> — device and browser details, IP address, app interactions, and live location of
            assigned delivery agents while an order is active. This data helps us keep the service running, secure, and accountable.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To process orders, route pickups and deliveries, and accept payments.</li>
          <li>To send transactional updates (order status, OTP, receipts) by SMS, email, or push notification.</li>
          <li>To investigate complaints, prevent fraud, and resolve disputes about cash payments.</li>
          <li>To improve our pricing, routing, and service quality through aggregated and anonymised analysis.</li>
          <li>To comply with legal obligations, including tax, anti-money-laundering, and lawful information requests.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Marketing">
        <p>
          We will send you operational messages about your orders. We will only send marketing or promotional messages if you opt in,
          and you can unsubscribe at any time from your profile or via the link in any marketing email.
        </p>
      </LegalSection>

      <LegalSection title="4. Sharing with third parties">
        <p>
          We share information with carefully chosen service providers only as needed: payment partners (bKash, Nagad, Rocket, card
          networks), email/SMS providers, cloud hosting and storage, mapping providers, and analytics. Each provider is bound by a
          contract that limits use of your information to the purpose we engage them for.
        </p>
        <p>
          We will share information with law enforcement or regulators when we are legally required to do so, or where we believe in
          good faith that disclosure is necessary to protect rights, safety, or property.
        </p>
        <p>We do not sell your personal information to advertisers.</p>
      </LegalSection>

      <LegalSection title="5. Security">
        <p>
          We use industry-standard measures to protect your information: encryption in transit, hashed passwords, role-based access
          control, audit logs on sensitive endpoints, and routine reviews of who can see what. No system is perfectly secure; please
          use a strong, unique password and notify us immediately if you suspect unauthorised activity.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          We keep account and order records for as long as your account is active and for a reasonable period afterwards to meet
          legal, accounting, and tax obligations. You can request deletion of your account at any time; we will remove or anonymise
          information that we are not required to keep.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices and rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>Access, correct, or delete your account information from your profile page.</li>
          <li>Manage saved addresses and remove the ones you no longer need.</li>
          <li>Opt out of marketing communications.</li>
          <li>
            Request a copy of the personal information we hold about you by writing to{' '}
            <a className="text-ironman-red underline" href="mailto:privacy@ironman.local">privacy@ironman.local</a>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Cookies and similar technologies">
        <p>
          We use a small number of cookies and local-storage entries to keep you signed in, remember your preferences, and measure
          aggregate usage. We do not use cross-site tracking pixels for advertising. You can clear these entries from your browser
          at any time; doing so will log you out.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          Our service is intended for adults. We do not knowingly collect personal information from children under 18. If you
          believe we have inadvertently received such information, please contact us so we can remove it.
        </p>
      </LegalSection>

      <LegalSection title="10. International transfers">
        <p>
          Our infrastructure may be operated in countries outside Bangladesh. Where we transfer information across borders, we use
          contractual and technical safeguards to keep it protected to a standard consistent with this Policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this Policy">
        <p>
          We will post material changes to this Policy in the app and, where appropriate, send you a notice. Continued use of the
          service after the effective date means you accept the updated Policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          For privacy questions or requests, write to{' '}
          <a className="text-ironman-red underline" href="mailto:privacy@ironman.local">privacy@ironman.local</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
