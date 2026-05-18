'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  PackageCheck,
  Shirt,
  Truck,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Quote,
  Shield,
  Zap,
  Clock,
  Pause,
  Play
} from 'lucide-react'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { PublicCatalog } from '@/components/public/public-catalog'

// ─── Data ──────────────────────────────────────────────────────────────────

const heroSlides = [
  {
    url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1920&q=90',
    kenClass: 'animate-ken-burns',
    headline: "Dhaka's Most Trusted",
    subheadline: 'Premium Laundry Service'
  },
  {
    url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1920&q=90',
    kenClass: 'animate-ken-burns-2',
    headline: 'Doorstep Pickup &',
    subheadline: 'Pristine Delivery'
  },
  {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=90',
    kenClass: 'animate-ken-burns-3',
    headline: 'Dry Cleaning &',
    subheadline: 'Steam Ironing Perfection'
  }
]

const steps = [
  {
    title: 'Place Order',
    body: 'Pick your items, services, and pickup slot. Add notes if you need anything special.',
    icon: PackageCheck,
    num: '01'
  },
  {
    title: 'We Pick Up',
    body: 'A delivery agent confirms pickup at your doorstep — tracked end-to-end.',
    icon: Truck,
    num: '02'
  },
  {
    title: 'We Process',
    body: 'Wash, dry-clean, steam, and iron — each step logged by trained specialists.',
    icon: Shirt,
    num: '03'
  },
  {
    title: 'Delivered Fresh',
    body: 'Spotless clothes arrive on schedule. COD totals are itemised and recorded.',
    icon: CheckCircle2,
    num: '04'
  }
]

const testimonials = [
  { quote: 'Fast pickup, clear communication, and perfect ironing. IRONMAN is the gold standard.', name: 'Rafiq Ahmed', location: 'Gulshan, Dhaka', rating: 5 },
  { quote: 'I can track every status from pickup to delivery in real time. Absolute transparency.', name: 'Sabrina Hossain', location: 'Dhanmondi, Dhaka', rating: 5 },
  { quote: 'COD payment logs make the whole process stress-free. My shirts have never looked this crisp.', name: 'Tanvir Islam', location: 'Bashundhara, Dhaka', rating: 5 },
  { quote: 'Clothes come back looking pristine. Worth every taka, without question.', name: 'Nusrat Jahan', location: 'Uttara, Dhaka', rating: 5 },
  { quote: 'Scheduling pickups is effortless. The most reliable laundry service I’ve used in Dhaka.', name: 'Karim Chowdhury', location: 'Mirpur, Dhaka', rating: 5 },
  { quote: 'Professional, premium, and precise. IRONMAN transformed my laundry routine.', name: 'Dilruba Khanam', location: 'Mohammadpur, Dhaka', rating: 5 }
]

const stats = [
  { value: '12,000+', label: 'Orders Completed', icon: CheckCircle2 },
  { value: '4.9★', label: 'Customer Rating', icon: Star },
  { value: '2 hr', label: 'Avg. Pickup Time', icon: Clock },
  { value: '100%', label: 'COD Transparency', icon: Shield }
]

// ─── Hooks ────────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return reduced
}

// ─── Section animation wrapper ────────────────────────────────────────────

function FadeInSection({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) { setVisible(true); return }
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: reduced
          ? 'none'
          : `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// ─── Testimonial card ─────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <figure className="mx-3 flex w-80 max-w-[85vw] flex-shrink-0 flex-col rounded-2xl border border-white/12 bg-white/[0.06] p-6 shadow-glass backdrop-blur"
      style={{ WebkitBackdropFilter: 'blur(16px)', backdropFilter: 'blur(16px)' }}
    >
      <Quote className="mb-3 h-6 w-6 opacity-60" style={{ color: '#C9A84C' }} aria-hidden />

      <div className="mb-3 flex items-center gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
        {Array.from({ length: t.rating }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: '#C9A84C' }} aria-hidden />
        ))}
      </div>

      <blockquote className="font-body text-sm leading-relaxed text-white/80">
        &ldquo;{t.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #1B2454, #D81B2A)' }}
          aria-hidden
        >
          {t.name[0]}
        </div>
        <div className="min-w-0">
          <div className="truncate font-body text-sm font-semibold text-white">{t.name}</div>
          <div className="truncate font-body text-xs text-white/45">{t.location}</div>
        </div>
        <span className="ml-auto inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1"
          style={{ background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 50%, #8B6914 100%)' }}
        >
          <Shield className="h-2.5 w-2.5 text-white" aria-hidden />
          <span className="font-body text-[9px] font-bold uppercase tracking-wide text-white">Verified</span>
        </span>
      </figcaption>
    </figure>
  )
}

// ─── Homepage Component ───────────────────────────────────────────────────

export default function HomePage() {
  const reduced = usePrefersReducedMotion()
  const [activeSlide, setActiveSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  // Bumped on every manual navigation to restart the autoplay timer — otherwise
  // clicking an arrow once would kill autoplay for the rest of the session.
  const [autoplayKey, setAutoplayKey] = useState(0)

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setActiveSlide(index)
    setAutoplayKey((key) => key + 1)
    window.setTimeout(() => setIsTransitioning(false), 900)
  }, [isTransitioning])

  // Autoplay — paused under reduced-motion or user toggle. Browsers throttle
  // background-tab timers automatically, so no explicit visibility handling.
  useEffect(() => {
    if (reduced || isPaused) return
    const id = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 7000)
    return () => window.clearInterval(id)
  }, [autoplayKey, reduced, isPaused])

  const prevSlide = () => goToSlide((activeSlide - 1 + heroSlides.length) % heroSlides.length)
  const nextSlide = () => goToSlide((activeSlide + 1) % heroSlides.length)

  // Duplicate testimonials for seamless marquee
  const allTestimonials = [...testimonials, ...testimonials]

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section
          aria-roledescription="carousel"
          aria-label="IRONMAN highlights"
          className="relative min-h-[600px] overflow-hidden bg-ironman-navy-dark md:min-h-[640px] lg:min-h-[680px] lg:h-[88vh] lg:max-h-[820px]"
        >
          {/* Slides */}
          {heroSlides.map((slide, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${heroSlides.length}`}
              aria-hidden={i !== activeSlide}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{ opacity: i === activeSlide ? 1 : 0, zIndex: i === activeSlide ? 1 : 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.url}
                alt=""
                role="presentation"
                className={`absolute inset-0 h-full w-full object-cover ${slide.kenClass}`}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
              {/* Single, calmer overlay for legible text */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(115deg, rgba(15,21,48,0.92) 0%, rgba(15,21,48,0.7) 45%, rgba(15,21,48,0.35) 100%), linear-gradient(to top, rgba(15,21,48,0.7), transparent 55%)'
                }}
              />
            </div>
          ))}

          {/* Content */}
          <div className="container-page relative z-20 flex h-full min-h-[inherit] items-center pb-28 pt-28 sm:pb-32 sm:pt-32 lg:pb-24 lg:pt-24">
            <div className="max-w-3xl">
              {/* Bangla tagline */}
              <div
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-ironman-red/35 px-3.5 py-1.5 sm:px-4 sm:py-2"
                style={{ background: 'rgba(216,27,42,0.14)', backdropFilter: 'blur(8px)' }}
              >
                <Sparkles className="h-3.5 w-3.5 text-ironman-red" aria-hidden />
                <span className="font-bangla text-sm font-medium text-white/90">পরিচ্ছন্নতায় আনে সজীবতা</span>
              </div>

              {/* Headline — the carousel role conveys slide change; we leave
                  aria-live off so autoplay doesn't make screen readers chatter. */}
              <h1
                className="font-display font-bold leading-[1.05] text-white"
                style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)', textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
              >
                <span className="block">{heroSlides[activeSlide].headline}</span>
                <span className="block text-ironman-red">{heroSlides[activeSlide].subheadline}</span>
              </h1>

              <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-white/75 sm:text-lg">
                Online laundry, dry cleaning, ironing, pickup &amp; delivery — with live order tracking and itemised cash-on-delivery receipts.
              </p>

              {/* CTAs — full-width on mobile, inline on sm+ */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Link
                  href="/customer/orders/new"
                  className="btn-shimmer tap-target focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-body text-base font-semibold text-white sm:w-auto sm:px-7"
                >
                  <Zap className="h-5 w-5" aria-hidden />
                  Place Order Now
                </Link>
                <Link
                  href="/track"
                  className="btn-glass tap-target focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-body text-base font-semibold text-white sm:w-auto sm:px-7"
                >
                  Track My Order
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </div>

              {/* Mini stats — 3-up on sm+, hidden on extra-small screens to reduce noise */}
              <dl className="mt-8 hidden grid-cols-3 gap-6 sm:mt-10 sm:grid sm:max-w-md">
                {stats.slice(0, 3).map(({ value, label }) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      <div className="font-display text-2xl font-bold leading-none text-white">{value}</div>
                      <div className="mt-1 font-body text-xs text-white/55">{label}</div>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Carousel controls — centred bottom bar, WCAG-sized */}
          <div className="absolute inset-x-0 bottom-5 z-20 flex items-center justify-center gap-2 sm:bottom-7 sm:gap-3">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="tap-target focus-ring flex items-center justify-center rounded-full border border-white/25 bg-black/20 text-white/85 backdrop-blur transition-colors hover:bg-black/35 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>

            <div className="flex items-center gap-1" role="tablist" aria-label="Choose slide">
              {heroSlides.map((slide, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === activeSlide}
                  aria-label={`Go to slide ${i + 1}: ${slide.headline} ${slide.subheadline}`}
                  onClick={() => goToSlide(i)}
                  className="focus-ring group flex h-11 items-center justify-center px-2"
                >
                  <span
                    aria-hidden
                    className="block h-1.5 rounded-full transition-all duration-300 group-hover:bg-white"
                    style={{
                      width: i === activeSlide ? 28 : 10,
                      background: i === activeSlide ? '#D81B2A' : 'rgba(255,255,255,0.55)'
                    }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="tap-target focus-ring flex items-center justify-center rounded-full border border-white/25 bg-black/20 text-white/85 backdrop-blur transition-colors hover:bg-black/35 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>

            {!reduced && (
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? 'Resume slideshow autoplay' : 'Pause slideshow autoplay'}
                aria-pressed={isPaused}
                className="tap-target focus-ring ml-1 hidden items-center justify-center rounded-full border border-white/25 bg-black/20 text-white/85 backdrop-blur transition-colors hover:bg-black/35 hover:text-white sm:flex"
              >
                {isPaused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
              </button>
            )}
          </div>
        </section>

        {/* ── STATS BAND ────────────────────────────────────────────────── */}
        <section aria-label="Service highlights" className="bg-ironman-navy">
          <div className="container-page">
            <dl className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
              {stats.map(({ value, label, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center bg-ironman-navy px-4 py-5 text-center">
                  <Icon className="mb-2 h-5 w-5 text-ironman-red" aria-hidden />
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <div className="font-display text-xl font-bold leading-none text-white sm:text-2xl">{value}</div>
                    <div className="mt-1 font-body text-[11px] text-white/55 sm:text-xs">{label}</div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── SERVICES ──────────────────────────────────────────────────── */}
        <section aria-labelledby="services-heading" className="container-page py-14 sm:py-20">
          <FadeInSection>
            <div className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2">
                  <span className="h-px w-8 bg-ironman-red" />
                  <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-red">Our Services</span>
                </div>
                <h2 id="services-heading" className="font-display text-3xl font-bold leading-tight text-ironman-navy sm:text-4xl md:text-5xl">
                  Premium Laundry<br />
                  <span className="text-ironman-red">Care by Category</span>
                </h2>
              </div>
              <Link
                href="/pricing"
                className="focus-ring group inline-flex items-center gap-2 self-start font-body text-sm font-semibold text-ironman-navy transition-colors hover:text-ironman-red md:self-end"
              >
                View full pricing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </FadeInSection>

          {/* PublicCatalog handles its own loading, error, and empty states */}
          <PublicCatalog mode="home" />
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section
          aria-labelledby="process-heading"
          className="relative overflow-hidden py-16 sm:py-20"
          style={{ background: 'linear-gradient(135deg, #0f1530 0%, #1B2454 60%, #0f1530 100%)' }}
        >
          <div className="container-page relative">
            <FadeInSection>
              <div className="mb-12 text-center sm:mb-14">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="h-px w-8 bg-ironman-red" />
                  <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-red">The Process</span>
                  <span className="h-px w-8 bg-ironman-red" />
                </div>
                <h2 id="process-heading" className="font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                  The <span className="text-ironman-red">IRONMAN</span> Standard
                </h2>
                <p className="mx-auto mt-4 max-w-xl font-body text-sm leading-relaxed text-white/60 sm:text-base">
                  Four steps from your doorstep to delivery — every detail meticulously logged.
                </p>
              </div>
            </FadeInSection>

            {/* Static connector line — calmer than the previous animated shimmer */}
            <div className="relative grid gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
              <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-10 hidden h-px bg-white/15 md:block" aria-hidden />

              {steps.map((step, i) => (
                <FadeInSection key={step.title} delay={i * 100}>
                  <div className="relative flex flex-col items-center px-2 text-center">
                    <div className="relative z-10 mb-5">
                      <div
                        className="relative flex h-20 w-20 items-center justify-center rounded-full text-white"
                        style={{
                          background: i % 2 === 0
                            ? 'linear-gradient(135deg, #0f1530, #1B2454)'
                            : 'linear-gradient(135deg, #a81220, #D81B2A)',
                          boxShadow: i % 2 === 0
                            ? '0 0 0 4px rgba(27,36,84,0.3), 0 10px 24px rgba(27,36,84,0.35)'
                            : '0 0 0 4px rgba(216,27,42,0.25), 0 10px 24px rgba(216,27,42,0.28)'
                        }}
                      >
                        <step.icon className="h-8 w-8" aria-hidden />
                      </div>
                      <span
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                        aria-hidden
                      >
                        <span className="font-body text-[10px] font-bold text-ironman-navy">{step.num}</span>
                      </span>
                    </div>
                    <h3 className="mb-2 font-display text-lg font-bold text-white sm:text-xl">{step.title}</h3>
                    <p className="max-w-[28ch] font-body text-sm leading-relaxed text-white/65">
                      {step.body}
                    </p>
                  </div>
                </FadeInSection>
              ))}
            </div>

            <FadeInSection delay={200}>
              <div className="mt-12 text-center sm:mt-14">
                <Link
                  href="/customer/orders/new"
                  className="btn-shimmer tap-target focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 font-body text-base font-semibold text-white sm:px-10"
                >
                  <Zap className="h-5 w-5" aria-hidden />
                  Start Your Order
                </Link>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
        <section aria-labelledby="testimonials-heading" className="relative overflow-hidden bg-ironman-navy py-16 sm:py-20">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 sm:w-24" style={{ background: 'linear-gradient(to right, #1B2454, transparent)' }} />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 sm:w-24" style={{ background: 'linear-gradient(to left, #1B2454, transparent)' }} />

          <FadeInSection>
            <div className="container-page mb-10 text-center sm:mb-12">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-ironman-gold" />
                <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-gold">What Customers Say</span>
                <span className="h-px w-8 bg-ironman-gold" />
              </div>
              <h2 id="testimonials-heading" className="font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                Premium Reviews from<br />
                <span className="text-gold-metallic">Verified Members</span>
              </h2>
            </div>
          </FadeInSection>

          {/* Marquee on motion-OK; static scroll list otherwise. List role + aria-label for screen readers */}
          <div className="relative overflow-hidden">
            {reduced ? (
              <div role="list" aria-label="Customer testimonials" className="container-page flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                {testimonials.map((t) => (
                  <div role="listitem" key={t.name} className="snap-start">
                    <TestimonialCard t={t} />
                  </div>
                ))}
              </div>
            ) : (
              <div role="list" aria-label="Customer testimonials" className="flex w-max animate-marquee">
                {allTestimonials.map((t, i) => (
                  <div role="listitem" key={`${t.name}-${i}`} aria-hidden={i >= testimonials.length}>
                    <TestimonialCard t={t} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── PRICING PREVIEW ───────────────────────────────────────────── */}
        <section aria-labelledby="pricing-heading" className="container-page py-14 sm:py-20">
          <FadeInSection>
            <div className="mb-8 sm:mb-10">
              <div className="mb-3 inline-flex items-center gap-2">
                <span className="h-px w-8 bg-ironman-red" />
                <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-red">Transparent Pricing</span>
              </div>
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <h2 id="pricing-heading" className="font-display text-3xl font-bold leading-tight text-ironman-navy sm:text-4xl md:text-5xl">
                  BDT Price Grid<br />
                  <span className="text-ironman-red">by Clothing Type</span>
                </h2>
                <Link
                  href="/pricing"
                  className="focus-ring group inline-flex items-center gap-2 self-start font-body text-sm font-semibold text-ironman-navy transition-colors hover:text-ironman-red md:self-end"
                >
                  Full pricing page
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            </div>
          </FadeInSection>
          <FadeInSection delay={80}>
            <PublicCatalog mode="pricing" />
          </FadeInSection>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section
          aria-labelledby="final-cta-heading"
          className="relative overflow-hidden py-16 sm:py-20"
          style={{ background: 'linear-gradient(135deg, #a81220 0%, #D81B2A 50%, #a81220 100%)' }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 40px)',
              backgroundSize: '40px 40px'
            }}
            aria-hidden
          />
          <FadeInSection>
            <div className="container-page text-center">
              <h2 id="final-cta-heading" className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                Ready for Perfectly<br />Clean Clothes?
              </h2>
              <p className="mt-4 font-bangla text-lg text-white/85 sm:text-xl">পরিচ্ছন্নতায় আনে সজীবতা</p>
              <div className="mx-auto mt-8 flex max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
                <Link
                  href="/customer/orders/new"
                  className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-body text-base font-bold text-ironman-red shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:px-8"
                >
                  <Zap className="h-5 w-5" aria-hidden />
                  Place Order Now
                </Link>
                <Link
                  href="/track"
                  className="focus-ring tap-target inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/50 px-7 py-3.5 font-body text-base font-semibold text-white transition-all duration-300 hover:border-white hover:bg-white/10 sm:px-8"
                >
                  Track Existing Order
                </Link>
              </div>
            </div>
          </FadeInSection>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
