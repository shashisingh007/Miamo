/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // v3.2 — Creativity remains the legacy route. /showcase is the new v3.2
  // surface backed by ShowcaseItem; both ship side-by-side during transition.
  // The 301 from /creativity → /showcase will be activated once feature parity
  // (composer + comments + reactions) lands.
  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  // Optimize icon library imports
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
  },
};

// ─── Sentry integration (Phase C.3) ─────────────────────────────
// Wraps the config with @sentry/nextjs ONLY when SENTRY_DSN is set so dev
// builds don't pull in the Sentry build plugin. The Sentry SDK itself is
// already a no-op at runtime when DSN is unset (see sentry.*.config.ts),
// so this gate is purely a build-time / install-time optimisation.
let exported = nextConfig;
if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { withSentryConfig } = require('@sentry/nextjs');
    exported = withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      tunnelRoute: undefined,
      hideSourceMaps: true,
      disableLogger: true,
    });
  } catch {
    exported = nextConfig;
  }
}

module.exports = exported;
