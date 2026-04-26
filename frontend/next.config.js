// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  images: {
    domains: ['localhost', 'school-management-files.s3.amazonaws.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry org + project from wizard
  org: 'orda-delivery',
  project: 'javascript-nextjs',

  // Only upload source maps in CI (requires SENTRY_AUTH_TOKEN)
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Hide source maps from browser DevTools in production
  hideSourceMaps: true,

  // Reduce logger noise
  disableLogger: true,

  // Enable automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
});
