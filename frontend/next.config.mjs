import { withSentryConfig } from '@sentry/nextjs'
import { validateFrontendEnv } from './env.validation.mjs'

validateFrontendEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  webpack: {
    treeshake: {
      removeDebugLogging: true
    }
  }
})
