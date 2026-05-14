'use client'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { PublicTracker } from '@/components/orders/public-tracker'
import { motion } from 'framer-motion'

export default function TrackPage() {
  return (
    <>
      {/* Apply variant="dark" so buttons are Navy Blue */}
      <SiteHeader variant="dark" />
      
      <main className="bg-ironman-navy-50 min-h-screen">
        {/* 
          pt-32 / sm:pt-40: Pushes the "Track Order" cards below the fixed logo 
        */}
        <section className="container-page pt-32 pb-16 sm:pt-40">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ironman-red">
                Live Status
              </p>
              <h1 className="mt-3 text-3xl font-bold text-ironman-navy sm:text-4xl md:text-5xl">
                Order <span className="text-ironman-red/80 font-display italic font-medium">Tracking</span>
              </h1>
              <div className="mt-4 h-1 w-12 bg-ironman-red rounded-full" />
            </div>

            <PublicTracker />
          </motion.div>
        </section>
      </main>
      
      <SiteFooter />
    </>
  )
}