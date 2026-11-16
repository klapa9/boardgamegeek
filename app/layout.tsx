import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Bricolage_Grotesque, Nunito_Sans } from 'next/font/google';
import PwaRegistration from '@/components/PwaRegistration';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import { createMetadata, siteConfig } from '@/lib/seo';

const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-display',
  display: 'swap'
});

const bodyFont = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-body',
  display: 'swap'
});

const defaultMetadata = createMetadata();

export const metadata: Metadata = {
  ...defaultMetadata,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.defaultTitle} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`
  },
  keywords: [
    'bordspelavond plannen',
    'bordspelavonden organiseren',
    'spelavond plannen',
    'bordspellenverzameling',
    'gezelschapsspellen organiseren',
    'beschikbaarheid prikken',
    'samen spellen kiezen'
  ],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512x512.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/icons/favicon-32x32.png']
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  themeColor: '#14213D'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${displayFont.variable} ${bodyFont.variable}`} suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <PwaRegistration />
          <SiteHeader />
          {children}
          <SiteFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
