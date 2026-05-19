import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
  {
    variants: {
      tone: {
        navy: 'border-ironman-navy-100 bg-ironman-navy-50 text-ironman-navy',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        red: 'border-ironman-red-100 bg-ironman-red-50 text-ironman-red',
        slate: 'border-slate-200 bg-slate-50 text-slate-600'
      }
    },
    defaultVariants: {
      tone: 'navy'
    }
  }
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { badgeVariants }
