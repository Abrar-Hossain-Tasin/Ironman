
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
  Clock
} from 'lucide-react'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { PublicCatalog } from '@/components/public/public-catalog'

// ─── Data ──────────────────────────────────────────────────────────────────

const heroSlides = [
  {
    url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1920&q=90',
    kenClass: 'animate-ken-burns',
    headline: 'Dhaka\'s Most Trusted',
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
    body: 'Select your clothing types, services, pickup slot, and add special notes through our seamless portal.',
    icon: PackageCheck,
    num: '01',
    color: 'from-ironman-navy to-ironman-navy-dark'
  },
  {
    title: 'We Pickup',
    body: 'Our delivery man accepts, starts, and confirms pickup at your doorstep — fully tracked in real-time.',
    icon: Truck,
    num: '02',
    color: 'from-ironman-red-dark to-ironman-red'
  },
  {
    title: 'We Process',
    body: 'Wash, dry clean, steam, and iron tasks are meticulously logged by certified specialists.',
    icon: Shirt,
    num: '03',
    color: 'from-ironman-navy to-ironman-navy-dark'
  },
  {
    title: 'Delivered Fresh',
    body: 'COD collection and delivery completion are fully recorded. Your order arrives spotless.',
    icon: CheckCircle2,
    num: '04',
    color: 'from-ironman-red-dark to-ironman-red'
  }
]

const testimonials = [
  {
    quote: 'Fast pickup, clear communication, and perfect ironing. IRONMAN is simply the gold standard.',
    name: 'Rafiq Ahmed',
    location: 'Gulshan, Dhaka',
    rating: 5
  },
  {
    quote: 'I can track every status from pickup to delivery in real time. Absolute transparency!',
    name: 'Sabrina Hossain',
    location: 'Dhanmondi, Dhaka',
    rating: 5
  },
  {
    quote: 'COD payment log makes the whole process stress-free. My shirts have never looked this crisp.',
    name: 'Tanvir Islam',
    location: 'Bashundhara, Dhaka',
    rating: 5
  },
  {
    quote: 'The clothes come back looking absolutely pristine. Worth every taka, without question.',
    name: 'Nusrat Jahan',
    location: 'Uttara, Dhaka',
    rating: 5
  },
  {
    quote: 'Scheduling pickups is effortless. The most reliable laundry service I\'ve ever used in Dhaka.',
    name: 'Karim Chowdhury',
    location: 'Mirpur, Dhaka',
    rating: 5
  },
  {
    quote: 'Professional, premium, and precise. IRONMAN has completely transformed my laundry routine.',
    name: 'Dilruba Khanam',
    location: 'Mohammadpur, Dhaka',
    rating: 5
  }
]

const stats = [
  { value: '12,000+', label: 'Orders Completed', icon: CheckCircle2 },
  { value: '4.9★', label: 'Customer Rating', icon: Star },
  { value: '2hr', label: 'Avg. Pickup Time', icon: Clock },
  { value: '100%', label: 'COD Transparent', icon: Shield }
]

// ─── Section Animation Wrapper ────────────────────────────────────────────

function FadeInSection({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

// ─── Service Card with 3D tilt ────────────────────────────────────────────

function ServiceCard({ service, index }: { service: { id: string; name: string; description?: string; icon?: string; startingPrice?: number }, index: number }) {
  const cardRef = useRef<HTMLElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const rotateX = ((y - cy) / cy) * -6
    const rotateY = ((x - cx) / cx) * 6
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`
    card.style.boxShadow = `${-rotateY * 2}px ${rotateX * 2}px 40px rgba(27,36,84,0.25), 0 20px 40px rgba(216,27,42,0.1)`
  }

  function handleMouseLeave() {
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)'
    card.style.boxShadow = '0 18px 45px rgba(27,36,84,0.10)'
  }

  const icons: Record<string, string> = {
    Waves: '🌊', Shirt: '👔', Sparkles: '✨', Footprints: '👟',
    BriefcaseBusiness: '🧳', Droplets: '💧', PackageCheck: '📦'
  }
  const emoji = icons[service.icon ?? ''] ?? '🧺'

  return (
    <FadeInSection delay={index * 80} className="h-full">
      <article
        ref={cardRef}
        className="group relative h-full cursor-default overflow-hidden rounded-2xl border border-ironman-navy-100 bg-white p-6 transition-all duration-300"
        style={{ boxShadow: '0 18px 45px rgba(27,36,84,0.10)', transformStyle: 'preserve-3d', willChange: 'transform' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Hover border gradient */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ borderColor: '#D81B2A', boxShadow: 'inset 0 0 0 1px rgba(216,27,42,0.15)' }}
        />
        {/* Corner accent */}
        <div className="absolute top-0 right-0 h-20 w-20 overflow-hidden rounded-2xl">
          <div className="absolute -top-10 -right-10 h-20 w-20 rounded-full bg-ironman-red opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20" />
        </div>

        {/* Icon */}
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ironman-navy-50 text-2xl transition-all duration-300 group-hover:bg-ironman-red group-hover:scale-110"
          style={{ boxShadow: '0 4px 12px rgba(27,36,84,0.1)' }}
        >
          <span className="transition-all duration-300 group-hover:grayscale-0">{emoji}</span>
        </div>

        <h3 className="font-display text-xl font-bold text-ironman-navy transition-colors duration-200 group-hover:text-ironman-red">
          {service.name}
        </h3>
        <p className="mt-2 min-h-16 font-body text-sm leading-relaxed text-gray-500">
          {service.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="font-body text-sm font-semibold text-ironman-navy">
            From ৳{service.startingPrice ?? 0}
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ironman-red/0 text-ironman-red transition-all duration-300 group-hover:bg-ironman-red group-hover:text-white">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </div>
        </div>
      </article>
    </FadeInSection>
  )
}

// ─── Testimonial card ─────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="flex-shrink-0 w-80 mx-3">
      <div className="relative rounded-2xl p-6 h-full"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}
      >
        {/* Gold quote mark */}
        <Quote className="h-7 w-7 mb-3 opacity-60" style={{ color: '#C9A84C' }} aria-hidden />

        {/* Rating stars */}
        <div className="flex items-center gap-0.5 mb-3">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: '#C9A84C' }} aria-hidden />
          ))}
        </div>

        <p className="font-body text-sm leading-relaxed text-white/80 mb-5">
          &ldquo;{t.quote}&rdquo;
        </p>

        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #1B2454, #D81B2A)' }}
          >
            {t.name[0]}
          </div>
          <div>
            <div className="font-body text-sm font-semibold text-white">{t.name}</div>
            <div className="font-body text-xs text-white/45">{t.location}</div>
          </div>
          {/* Verified badge */}
          <div className="ml-auto flex items-center gap-1 rounded-full px-2 py-1"
            style={{
              background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 50%, #8B6914 100%)',
              boxShadow: '0 2px 8px rgba(201,168,76,0.4)'
            }}
          >
            <Shield className="h-2.5 w-2.5 text-white" aria-hidden />
            <span className="font-body text-[9px] font-bold uppercase tracking-wide text-white">Verified</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Homepage Component ───────────────────────────────────────────────────

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setActiveSlide(index)
    setTimeout(() => setIsTransitioning(false), 1200)
  }, [isTransitioning])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 6000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const prevSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    goToSlide((activeSlide - 1 + heroSlides.length) % heroSlides.length)
  }
  const nextSlide = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    goToSlide((activeSlide + 1) % heroSlides.length)
  }

  // Duplicate testimonials for seamless marquee
  const allTestimonials = [...testimonials, ...testimonials]

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── CINEMATIC HERO ────────────────────────────────────────────── */}
        <section className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-ironman-navy-dark">
          {/* Slides */}
          {heroSlides.map((slide, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
              style={{ opacity: i === activeSlide ? 1 : 0, zIndex: i === activeSlide ? 1 : 0 }}
            >
              <img
                src={slide.url}
                alt={slide.subheadline}
                className={`absolute inset-0 h-full w-full object-cover ${slide.kenClass}`}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              {/* Multi-layer overlay for depth */}
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to right, rgba(15,21,48,0.92) 0%, rgba(15,21,48,0.65) 55%, rgba(15,21,48,0.3) 100%)'
              }} />
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(to top, rgba(15,21,48,0.8) 0%, transparent 50%)'
              }} />
            </div>
          ))}

          {/* Decorative vertical lines */}
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden opacity-20">
            {[15, 35, 65, 85].map((left) => (
              <div key={left} className="absolute top-0 bottom-0 w-px bg-white/20"
                style={{ left: `${left}%` }} />
            ))}
          </div>

          {/* Content Wrapper */}
          <div className="container-page relative z-20 flex h-full items-center pt-32 lg:pt-20"> 
            <div className="max-w-3xl mt-12 md:mt-16">
              {/* Bangla tagline */}
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2"
                style={{
                  background: 'rgba(216,27,42,0.15)',
                  border: '1px solid rgba(216,27,42,0.35)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-ironman-red" aria-hidden />
                <span className="font-bangla text-sm font-medium text-white/90"
                  style={{ textShadow: '0 0 20px rgba(216,27,42,0.5)' }}
                >
                  পরিচ্ছন্নতায় আনে সজীবতা
                </span>
              </div>

              {/* Main headline */}
              <h1
                className="font-display font-bold text-white leading-[1.1]"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.8rem)', 
                  textShadow: '0 4px 30px rgba(0,0,0,0.4)'
                }}
              >
                <span className="block transition-all duration-700">
                  {heroSlides[activeSlide].headline}
                </span>
                <span className="block text-ironman-red transition-all duration-700"
                  style={{ textShadow: '0 0 40px rgba(216,27,42,0.4)' }}
                >
                  {heroSlides[activeSlide].subheadline}
                </span>
              </h1>

              <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-white/70">
                Online laundry, dry cleaning, ironing, pickup & delivery — with live order tracking and fully logged cash-on-delivery payments.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="/customer/orders/new"
                  className="tap-target focus-ring inline-flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 font-body text-base font-semibold text-white btn-shimmer"
                >
                  <Zap className="h-5 w-5" aria-hidden />
                  Place Order Now
                </Link>
                <Link
                  href="/track"
                  className="tap-target focus-ring inline-flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 font-body text-base font-semibold text-white btn-glass"
                >
                  Track My Order
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </div>

              {/* Mini stats */}
              <div className="mt-10 flex flex-wrap gap-6">
                {stats.slice(0, 3).map(({ value, label }) => (
                  <div key={label}>
                    <div className="font-display text-2xl font-bold text-white">{value}</div>
                    <div className="font-body text-xs text-white/50 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live stats glass card – bottom right */}
          <div className="absolute bottom-8 right-8 z-20 hidden lg:block">
            <div className="rounded-2xl p-5 w-56"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }}
            >
              <p className="font-body text-[10px] font-semibold uppercase tracking-widest text-ironman-red mb-3">Live Today</p>
              {[
                { label: 'Pickup Assigned', value: '18', color: '#3B82F6' },
                { label: 'In Processing', value: '9', color: '#F97316' },
                { label: 'Ready for Delivery', value: '6', color: '#22C55E' }
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/8 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
                    <span className="font-body text-xs text-white/70">{label}</span>
                  </div>
                  <span className="font-display text-lg font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slide controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
            <button onClick={prevSlide} aria-label="Previous slide"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 backdrop-blur transition-all hover:border-white/50 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex items-center gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="transition-all duration-300"
                  style={{
                    height: '3px',
                    width: i === activeSlide ? '28px' : '10px',
                    borderRadius: '9999px',
                    background: i === activeSlide ? '#D81B2A' : 'rgba(255,255,255,0.35)'
                  }}
                />
              ))}
            </div>
            <button onClick={nextSlide} aria-label="Next slide"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 backdrop-blur transition-all hover:border-white/50 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </section>

        {/* ── STATS BAND ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-ironman-navy py-5">
          <div className="container-page">
            <div className="grid grid-cols-2 divide-x divide-white/10 md:grid-cols-4">
              {stats.map(({ value, label, icon: Icon }, i) => (
                <FadeInSection key={label} delay={i * 80}>
                  <div className="flex flex-col items-center px-6 py-4 text-center">
                    <Icon className="h-5 w-5 text-ironman-red mb-2" aria-hidden />
                    <div className="font-display text-2xl font-bold text-white">{value}</div>
                    <div className="font-body text-xs text-white/50 mt-1">{label}</div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── SERVICE CARDS ─────────────────────────────────────────────── */}
        <section className="container-page py-20">
          <FadeInSection>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end mb-10">
              <div>
                <div className="mb-3 inline-flex items-center gap-2">
                  <div className="h-px w-8 bg-ironman-red" />
                  <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-red">Our Services</span>
                </div>
                <h2 className="font-display text-4xl font-bold text-ironman-navy leading-tight md:text-5xl">
                  Premium Laundry<br />
                  <span className="text-ironman-red">Care by Category</span>
                </h2>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ironman-navy transition-colors hover:text-ironman-red group"
              >
                View full pricing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </FadeInSection>

          {/* PublicCatalog renders the actual API-fetched service cards */}
          <div className="[&_.grid]:!grid [&_.grid]:!gap-5 [&_.grid]:!md:grid-cols-3 [&_.grid]:!lg:grid-cols-5">
            <PublicCatalog mode="home" />
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-24"
          style={{ background: 'linear-gradient(135deg, #0f1530 0%, #1B2454 60%, #0f1530 100%)' }}
        >
          {/* Background decorative circles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-ironman-red opacity-[0.04] blur-3xl" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-ironman-red opacity-[0.04] blur-3xl" />
          </div>

          <div className="container-page relative">
            <FadeInSection>
              <div className="text-center mb-16">
                <div className="mb-3 flex items-center justify-center gap-2">
                  <div className="h-px w-8 bg-ironman-red" />
                  <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-red">The Process</span>
                  <div className="h-px w-8 bg-ironman-red" />
                </div>
                <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
                  The <span className="text-ironman-red">IRONMAN</span> Standard
                </h2>
                <p className="mt-4 font-body text-white/55 max-w-lg mx-auto leading-relaxed">
                  Four seamlessly orchestrated steps — from your doorstep to delivery, every detail meticulously logged.
                </p>
              </div>
            </FadeInSection>

            {/* Steps grid with pulsing connecting line */}
            <div className="relative grid gap-6 md:grid-cols-4 md:gap-0">
              {/* Connecting pulse line (desktop only) */}
              <div className="absolute top-10 left-[12.5%] right-[12.5%] hidden h-px md:block"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <div className="absolute inset-0 overflow-hidden">
                  <div className="h-full w-full"
                    // style={{
                    //   background: 'linear-gradient(90deg, transparent 0%, #D81B2A 30%, #D81B2A 70%, transparent 100%)',
                    //   animation: 'line-grow 2s ease-out forwards',
                    //   backgroundSize: '200% 100%',
                    //   animation: 'border-shimmer 3s linear infinite'
                    // }}
                    style={{
  animation: 'line-grow 2s ease-out forwards, border-shimmer 3s linear infinite',
  backgroundSize: '200% 100%',
}}
                  />
                </div>
              </div>

              {steps.map((step, i) => (
                <FadeInSection key={step.title} delay={i * 120}>
                  <div className="group relative flex flex-col items-center text-center px-4">
                    {/* Number badge */}
                    <div className="relative mb-5 z-10">
                      {/* Outer pulse ring */}
                      <div className="absolute inset-0 rounded-full animate-pulse-ring"
                        style={{ background: i % 2 === 0 ? 'rgba(27,36,84,0.3)' : 'rgba(216,27,42,0.3)' }}
                      />
                      <div
                        className="relative flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${i % 2 === 0 ? '#0f1530, #1B2454' : '#a81220, #D81B2A'})`,
                          boxShadow: i % 2 === 0
                            ? '0 0 0 4px rgba(27,36,84,0.3), 0 12px 30px rgba(27,36,84,0.4)'
                            : '0 0 0 4px rgba(216,27,42,0.25), 0 12px 30px rgba(216,27,42,0.3)'
                        }}
                      >
                        <step.icon className="h-8 w-8" aria-hidden />
                      </div>
                      {/* Step number */}
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                      >
                        <span className="font-body text-[10px] font-bold text-ironman-navy">{step.num}</span>
                      </div>
                    </div>

                    <h3 className="font-display text-xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="font-body text-sm leading-relaxed text-white/55 max-w-[16ch] mx-auto">
                      {step.body}
                    </p>
                  </div>
                </FadeInSection>
              ))}
            </div>

            {/* CTA */}
            <FadeInSection delay={200}>
              <div className="mt-14 text-center">
                <Link
                  href="/customer/orders/new"
                  className="tap-target focus-ring inline-flex items-center justify-center gap-3 rounded-2xl px-10 py-4 font-body text-base font-semibold text-white btn-shimmer"
                >
                  <Zap className="h-5 w-5" aria-hidden />
                  Start Your Order
                </Link>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ── TESTIMONIALS MARQUEE ──────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-ironman-navy py-20">
          {/* Gradient fades on edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10"
            style={{ background: 'linear-gradient(to right, #1B2454, transparent)' }}
          />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10"
            style={{ background: 'linear-gradient(to left, #1B2454, transparent)' }}
          />

          <FadeInSection>
            <div className="text-center mb-12 px-4">
              <div className="mb-3 flex items-center justify-center gap-2">
                <div className="h-px w-8 bg-ironman-gold" />
                <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-gold">What Customers Say</span>
                <div className="h-px w-8 bg-ironman-gold" />
              </div>
              <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
                Premium Reviews from<br />
                <span className="text-gold-metallic">Verified Members</span>
              </h2>
            </div>
          </FadeInSection>

          {/* Infinite marquee */}
          <div className="relative overflow-hidden">
            <div
              ref={marqueeRef}
              className="flex w-max animate-marquee"
              style={{ willChange: 'transform' }}
            >
              {allTestimonials.map((t, i) => (
                <TestimonialCard key={`${t.name}-${i}`} t={t} />
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING PREVIEW ───────────────────────────────────────────── */}
        <section className="container-page py-20">
          <FadeInSection>
            <div className="mb-10">
              <div className="mb-3 inline-flex items-center gap-2">
                <div className="h-px w-8 bg-ironman-red" />
                <span className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ironman-red">Transparent Pricing</span>
              </div>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <h2 className="font-display text-4xl font-bold text-ironman-navy leading-tight md:text-5xl">
                  BDT Price Grid<br />
                  <span className="text-ironman-red">by Clothing Type</span>
                </h2>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ironman-navy transition-colors hover:text-ironman-red group"
                >
                  Full pricing page
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            </div>
          </FadeInSection>
          <FadeInSection delay={100}>
            <PublicCatalog mode="pricing" />
          </FadeInSection>
        </section>

        {/* ── FINAL CTA BAND ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20"
          style={{ background: 'linear-gradient(135deg, #a81220 0%, #D81B2A 50%, #a81220 100%)' }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 40px)',
              backgroundSize: '40px 40px'
            }}
          />
          <FadeInSection>
            <div className="container-page text-center">
              <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
                Ready for Perfectly<br />Clean Clothes?
              </h2>
              <p className="mt-4 font-bangla text-xl text-white/80">পরিচ্ছন্নতায় আনে সজীবতা</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/customer/orders/new"
                  className="tap-target focus-ring inline-flex items-center justify-center gap-2.5 rounded-2xl bg-white px-8 py-4 font-body text-base font-bold text-ironman-red transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Zap className="h-5 w-5" aria-hidden />
                  Place Order Now
                </Link>
                <Link
                  href="/track"
                  className="tap-target focus-ring inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-white/40 px-8 py-4 font-body text-base font-semibold text-white transition-all duration-300 hover:border-white hover:bg-white/10"
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
