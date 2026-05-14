// Single source of truth for public-facing brand contact details.
// Override per-environment with NEXT_PUBLIC_* vars (see .env.example).
// Defaults are routable placeholders — no non-deliverable .local addresses.
export const BRAND = {
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL ?? 'support@ironmanlaundry.com',
  phone: process.env.NEXT_PUBLIC_BRAND_PHONE ?? '+880 1700-000000',
  address: process.env.NEXT_PUBLIC_BRAND_ADDRESS ?? 'Dhaka, Bangladesh',
  social: {
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? '',
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ?? '',
    twitter: process.env.NEXT_PUBLIC_SOCIAL_TWITTER ?? ''
  }
} as const
