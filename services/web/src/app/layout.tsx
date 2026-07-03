import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const brand = Cormorant_Garamond({ subsets: ['latin', 'latin-ext'], variable: '--font-brand', weight: ['600', '700'] });

export const metadata: Metadata = {
  title: 'Miamo — Premium Dating App',
  description: 'A premium dating and social platform for meaningful connections, thoughtful matching, and authentic relationships.',
  keywords: ['dating', 'social', 'meaningful connections', 'relationships', 'AI matching'],
  icons: {
    icon: '/assets/logo.svg',
    shortcut: '/assets/logo.svg',
    apple: '/assets/logo.svg',
  },
  openGraph: {
    title: 'Miamo — Premium Dating App',
    description: 'Premium dating and social platform',
    type: 'website',
    siteName: 'Miamo',
    images: [{ url: '/assets/logo.svg', width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover', // iOS notch / home-indicator: allow content under safe areas, padded via env(safe-area-inset-*)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${brand.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
