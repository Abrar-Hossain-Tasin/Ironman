'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { AuthForm } from '@/components/auth/auth-form'

export function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login'

  return (
    <main className="flex min-h-screen bg-white">
      {/* ─── LEFT: Cinematic Branding (60% Desktop) ────────────────────────── */}
      <section className="relative hidden w-[60%] overflow-hidden lg:block bg-ironman-navy-dark">
        {/* Animated Background Image */}
        <motion.img
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.5 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=90"
          className="absolute inset-0 h-full w-full object-cover"
        />
        
        {/* Luxury Overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-ironman-navy-dark via-ironman-navy-dark/70 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-16">
          {/* Desktop Logo - FIXED VERSION */}
          <Link href="/" className="group animate-float-luxury inline-flex items-center">
             <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 transition-all group-hover:border-ironman-red/50 shadow-glass">
                <Image 
                  src="/Ironman-logo.png" 
                  alt="IRONMAN Logo" 
                  width={180}   // Defined width
                  height={50}   // Defined height
                  className="brightness-0 invert" // Ensures logo turns white/silver
                  priority
                />
             </div>
          </Link>

          {/* Branding Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
             <div className="inline-flex items-center gap-2 rounded-full bg-ironman-red/20 px-4 py-2 border border-ironman-red/30 backdrop-blur-md mb-6">
                <Sparkles className="h-4 w-4 text-ironman-red" />
                <span className="font-bangla text-sm font-medium text-white">পরিচ্ছন্নতায় আনে সজীবতা</span>
             </div>
             <h1 className="font-display text-7xl font-bold text-white leading-[0.9] tracking-tight">
                Pristine <br /> <span className="text-ironman-red">Restoration.</span>
             </h1>
             <p className="mt-8 max-w-md font-body text-lg text-white/50 leading-relaxed">
                Dhaka's most exclusive laundry experience. We provide meticulous care for your most precious garments.
             </p>
          </motion.div>

          <div className="flex items-center justify-between border-t border-white/10 pt-8">
            <p className="font-body text-[10px] uppercase tracking-[0.4em] text-white/30">Luxury Garment Care</p>
            <div className="flex gap-4">
               <div className="h-1 w-12 bg-ironman-red rounded-full" />
               <div className="h-1 w-4 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── RIGHT: Form Area (40% Desktop) ────────────────── */}
      <section className="flex w-full flex-col justify-center px-8 lg:w-[40%] lg:px-20 bg-ironman-navy-50/20">
        <div className="mx-auto w-full max-w-sm">
          
          {/* Logo on Right side - Visible on Mobile and as a header on Desktop */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center lg:items-start"
          >
            <Link href="/" className="mb-6">
              <Image 
                src="/Ironman-logo.png" 
                alt="IRONMAN Logo" 
                width={150} 
                height={45} 
                className="object-contain" // Full color version for white background
              />
            </Link>
            
            <Link href="/" className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-ironman-red transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Home
            </Link>

            <AnimatePresence mode="wait">
              <motion.div 
                key={mode} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-center lg:text-left"
              >
                <h2 className="font-display text-4xl font-bold text-ironman-navy mt-4">
                  {isLogin ? 'Sign in to Your Portal' : 'Create Member Account'}
                </h2>
                <div className="mt-3 h-1 w-12 bg-ironman-red rounded-full mx-auto lg:mx-0" />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <AuthForm mode={mode} />

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 text-center font-body text-sm text-gray-500"
          >
            {isLogin ? "New to the experience?" : "Already a member?"}{' '}
            <Link 
              href={isLogin ? '/register' : '/login'} 
              className="font-bold text-ironman-red hover:text-ironman-red-dark transition-all underline underline-offset-4"
            >
              {isLogin ? 'Register Your Account' : 'Access Member Portal'}
            </Link>
          </motion.p>
        </div>
      </section>
    </main>
  )
}