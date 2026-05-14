'use client'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { PublicCatalog } from '@/components/public/public-catalog'
import { motion } from 'framer-motion'

export default function PricingPage() {
  return (
    <>
      <SiteHeader variant="dark" />
      <main className="bg-ironman-navy-50 min-h-screen">
        {/* 
          pt-32: Ensures content starts below the fixed header on mobile.
          sm:pt-40: Adds extra breathing room for the tall desktop header.
        */}
        <section className="container-page pt-32 pb-16 sm:pt-40">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ironman-red">
              Transparent Rates
            </p>
            <h1 className="mt-3 text-3xl font-bold text-ironman-navy sm:text-4xl md:text-5xl lg:leading-tight">
              BDT Pricing <br className="sm:hidden" />
              <span className="text-ironman-red/80 font-display italic font-medium">by Clothing Type</span>
            </h1>
            
            {/* Added a margin-top to separate the title from the selectors/table */}
            <div className="mt-10 sm:mt-12">
              <PublicCatalog mode="pricing" />
            </div>
          </motion.div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}