import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import ProfileLauncher from '@/components/ProfileLauncher';
import PwaRegistration from '@/components/PwaRegistration';
import { createMetadata, siteConfig } from '@/lib/seo';

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
  themeColor: '#172036'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <PwaRegistration />
          <ProfileLauncher />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
