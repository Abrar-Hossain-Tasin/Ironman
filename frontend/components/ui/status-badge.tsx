
import type { AssignmentStatus, OrderStatus, PaymentStatus } from '@/types'
import { cn, statusLabel } from '@/lib/utils'

type StatusBadgeProps = {
  status: OrderStatus | AssignmentStatus | PaymentStatus
  className?: string
}

// Map each status to: background, text color, glow CSS class, and optional pulse
const statusConfig: Record<string, {
  bg: string
  text: string
  border: string
  glowClass: string
  pulse?: boolean
  dot?: string
}> = {
  pending: {
    bg: 'rgba(107, 114, 128, 0.12)',
    text: '#6B7280',
    border: 'rgba(107, 114, 128, 0.3)',
    glowClass: 'badge-glow-gray',
    dot: 'bg-gray-400'
  },
  confirmed: {
    bg: 'rgba(27, 36, 84, 0.12)',
    text: '#1B2454',
    border: 'rgba(27, 36, 84, 0.35)',
    glowClass: 'badge-glow-navy',
    dot: 'bg-ironman-navy'
  },
  pickup_assigned: {
    bg: 'rgba(59, 130, 246, 0.12)',
    text: '#2563EB',
    border: 'rgba(59, 130, 246, 0.35)',
    glowClass: 'badge-glow-blue',
    dot: 'bg-blue-500'
  },
  picked_up: {
    bg: 'rgba(29, 78, 216, 0.12)',
    text: '#1D4ED8',
    border: 'rgba(29, 78, 216, 0.35)',
    glowClass: 'badge-glow-blue',
    dot: 'bg-blue-700'
  },
  in_wash: {
    bg: 'rgba(6, 182, 212, 0.12)',
    text: '#0891B2',
    border: 'rgba(6, 182, 212, 0.35)',
    glowClass: 'badge-glow-cyan',
    pulse: true,
    dot: 'bg-cyan-500'
  },
  wash_complete: {
    bg: 'rgba(6, 182, 212, 0.08)',
    text: '#0E7490',
    border: 'rgba(6, 182, 212, 0.2)',
    glowClass: 'badge-glow-cyan',
    dot: 'bg-cyan-400'
  },
  in_iron: {
    bg: 'rgba(249, 115, 22, 0.12)',
    text: '#C2410C',
    border: 'rgba(249, 115, 22, 0.35)',
    glowClass: 'badge-glow-orange',
    pulse: true,
    dot: 'bg-orange-500'
  },
  iron_complete: {
    bg: 'rgba(249, 115, 22, 0.08)',
    text: '#EA580C',
    border: 'rgba(249, 115, 22, 0.2)',
    glowClass: 'badge-glow-orange',
    dot: 'bg-orange-400'
  },
  in_dry_clean: {
    bg: 'rgba(168, 85, 247, 0.12)',
    text: '#7C3AED',
    border: 'rgba(168, 85, 247, 0.35)',
    glowClass: 'badge-glow-purple',
    pulse: true,
    dot: 'bg-purple-500'
  },
  dry_clean_complete: {
    bg: 'rgba(168, 85, 247, 0.08)',
    text: '#9333EA',
    border: 'rgba(168, 85, 247, 0.2)',
    glowClass: 'badge-glow-purple',
    dot: 'bg-purple-400'
  },
  waiting_for_iron: {
    bg: 'rgba(216, 27, 42, 0.08)',
    text: '#D81B2A',
    border: 'rgba(216, 27, 42, 0.25)',
    glowClass: 'badge-glow-red',
    dot: 'bg-ironman-red'
  },
  ready: {
    bg: 'rgba(34, 197, 94, 0.12)',
    text: '#15803D',
    border: 'rgba(34, 197, 94, 0.4)',
    glowClass: 'badge-glow-green',
    pulse: true,
    dot: 'bg-green-500'
  },
  delivery_assigned: {
    bg: 'rgba(27, 36, 84, 0.08)',
    text: '#1B2454',
    border: 'rgba(27, 36, 84, 0.2)',
    glowClass: 'badge-glow-navy',
    dot: 'bg-ironman-navy-200'
  },
  out_for_delivery: {
    bg: 'rgba(234, 179, 8, 0.12)',
    text: '#A16207',
    border: 'rgba(234, 179, 8, 0.4)',
    glowClass: 'badge-glow-yellow',
    pulse: true,
    dot: 'bg-yellow-500'
  },
  delivered: {
    bg: 'rgba(21, 128, 61, 0.12)',
    text: '#15803D',
    border: 'rgba(21, 128, 61, 0.35)',
    glowClass: 'badge-glow-green',
    dot: 'bg-green-700'
  },
  cancelled: {
    bg: 'rgba(216, 27, 42, 0.1)',
    text: '#D81B2A',
    border: 'rgba(216, 27, 42, 0.3)',
    glowClass: '',
    dot: 'bg-ironman-red'
  },
  accepted: {
    bg: 'rgba(27, 36, 84, 0.08)',
    text: '#1B2454',
    border: 'rgba(27, 36, 84, 0.2)',
    glowClass: 'badge-glow-navy',
    dot: 'bg-ironman-navy'
  },
  in_progress: {
    bg: 'rgba(216, 27, 42, 0.12)',
    text: '#D81B2A',
    border: 'rgba(216, 27, 42, 0.35)',
    glowClass: 'badge-glow-red',
    pulse: true,
    dot: 'bg-ironman-red'
  },
  completed: {
    bg: 'rgba(21, 128, 61, 0.12)',
    text: '#15803D',
    border: 'rgba(21, 128, 61, 0.35)',
    glowClass: 'badge-glow-green',
    dot: 'bg-green-700'
  },
  rejected: {
    bg: 'rgba(220, 38, 38, 0.1)',
    text: '#DC2626',
    border: 'rgba(220, 38, 38, 0.3)',
    glowClass: '',
    dot: 'bg-red-600'
  },
  paid: {
    bg: 'rgba(21, 128, 61, 0.12)',
    text: '#15803D',
    border: 'rgba(21, 128, 61, 0.35)',
    glowClass: 'badge-glow-green',
    dot: 'bg-green-600'
  },
  partial: {
    bg: 'rgba(234, 179, 8, 0.10)',
    text: '#A16207',
    border: 'rgba(234, 179, 8, 0.3)',
    glowClass: 'badge-glow-yellow',
    dot: 'bg-yellow-500'
  }
}

const fallbackConfig = {
  bg: 'rgba(107, 114, 128, 0.1)',
  text: '#6B7280',
  border: 'rgba(107, 114, 128, 0.2)',
  glowClass: '',
  dot: 'bg-gray-400'
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? fallbackConfig

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-body font-semibold uppercase tracking-[0.08em]',
        config.glowClass,
        className
      )}
      style={{
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      {/* Animated dot indicator */}
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {config.pulse && (
          <span
            className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', config.dot)}
          />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', config.dot)} />
      </span>
      {statusLabel(status as OrderStatus)}
    </span>
  )
}
