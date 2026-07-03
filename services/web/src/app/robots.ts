import type { MetadataRoute } from 'next';

// Next.js App Router auto-routes this file at `/robots.txt`. Centralised here
// so the policy travels with the rest of the metadata. `metadataBase` should
// be set via the `NEXT_PUBLIC_SITE_URL` env var in production deploys; in dev
// we fall back to localhost which is a no-op for crawlers anyway.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Allow marketing/landing/legal pages; block authenticated app surfaces
        // so search engines don't try to crawl in-app routes that 401 anyway.
        allow: ['/', '/login', '/register', '/forgot-password'],
        disallow: ['/api/', '/discover', '/matches', '/messages', '/profile', '/settings', '/feed', '/stories', '/creativity', '/beats'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
