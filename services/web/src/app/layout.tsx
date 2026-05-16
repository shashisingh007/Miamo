import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Miamo — Premium Dating App',
  description: 'A premium dating and social platform for meaningful connections, thoughtful matching, and authentic relationships.',
  keywords: ['dating', 'social', 'meaningful connections', 'relationships', 'AI matching'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Miamo — Premium Dating App',
    description: 'Premium dating and social platform',
    type: 'website',
    siteName: 'Miamo',
    images: [{ url: '/logo.png', width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FDF2F5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
