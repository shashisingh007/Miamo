import type { MetadataRoute } from 'next';

// PWA manifest — enables "Add to Home Screen" on mobile browsers and gives
// the app a standalone shell with the brand colors. Icon path uses the
// existing SVG logo until raster PWA icons are added.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Miamo — Premium Dating App',
    short_name: 'Miamo',
    description: 'Premium dating and social platform for meaningful connections.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF8F5',
    theme_color: '#C97856',
    icons: [
      {
        src: '/assets/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['social', 'lifestyle'],
  };
}
