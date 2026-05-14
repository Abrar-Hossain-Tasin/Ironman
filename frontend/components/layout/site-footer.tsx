

import Link from 'next/link'
import { MapPin, Mail, Clock, Phone, Instagram, Facebook, Twitter } from 'lucide-react'

const footerLinks = {
  services: [
    { href: '/pricing', label: 'Wash & Fold' },
    { href: '/pricing', label: 'Dry Cleaning' },
    { href: '/pricing', label: 'Steam Iron' },
    { href: '/pricing', label: 'Shoe Care' },
    { href: '/pricing', label: 'Curtains & Bedding' }
  ],
  company: [
    { href: '/', label: 'About IRONMAN' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/track', label: 'Track Order' },
    { href: '/login', label: 'Customer Portal' }
  ],
  legal: [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/refund-policy', label: 'Refund Policy' }
  ]
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-ironman-navy-dark">
      {/* Background noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }}
      />
      {/* Decorative top border with gradient */}
      <div className="h-px bg-gradient-to-r from-transparent via-ironman-red/60 to-transparent" />

      <div className="container-page py-16">
        {/* Top section */}
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
          {/* Brand column */}
          <div>
            <div className="mb-6">
              <div className="font-display text-4xl font-bold text-white leading-none mb-2"
                style={{ textShadow: '0 0 40px rgba(255,255,255,0.1)' }}
              >
                IRONMAN
              </div>
              <div className="font-bangla text-ironman-red text-lg font-medium">পরিচ্ছন্নতায় আনে সজীবতা</div>
            </div>
            <p className="font-body text-sm leading-7 text-white/60 max-w-xs">
              Dhaka's most trusted premium laundry, dry cleaning, and doorstep delivery service — fully tracked, fully transparent.
            </p>
            {/* Social links */}
            <div className="mt-6 flex items-center gap-3">
              {[
                { Icon: Facebook, label: 'Facebook' },
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Twitter, label: 'Twitter' }
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/50 transition-all duration-300 hover:border-ironman-red/50 hover:bg-ironman-red/10 hover:text-ironman-red"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-ironman-red mb-6">Services</h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/55 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-ironman-red mb-6">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/55 transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-ironman-red mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-ironman-red mt-0.5 flex-shrink-0" aria-hidden />
                <span className="font-body text-sm text-white/60 leading-relaxed">
                  Dhaka, Bangladesh
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-ironman-red flex-shrink-0" aria-hidden />
                <a href="mailto:support@ironman.local" className="font-body text-sm text-white/60 hover:text-white transition-colors">
                  support@ironman.local
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-ironman-red flex-shrink-0" aria-hidden />
                <span className="font-body text-sm text-white/60">+880 1700-000000</span>
              </li>
              <li>
                <div className="mt-2 rounded-xl border border-white/8 p-4"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 text-ironman-red" aria-hidden />
                    <span className="font-body text-xs font-semibold uppercase tracking-wide text-white/40">Hours</span>
                  </div>
                  <p className="font-body text-xs text-white/55 leading-relaxed">
                    Pickup: 9:00 AM – 8:00 PM<br />
                    Delivery: 10:00 AM – 9:00 PM
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 h-px bg-white/8" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-body text-xs text-white/35">
            © {new Date().getFullYear()} IRONMAN Laundry. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <Link key={link.href} href={link.href} className="font-body text-xs text-white/35 hover:text-white/70 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}