import type { MetadataRoute } from 'next';

// Static sitemap covering only the publicly indexable surface. Authenticated
// app routes are explicitly excluded (see robots.ts disallow list).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3100';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/login', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/register', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/forgot-password', priority: 0.3, changeFrequency: 'yearly' },
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
