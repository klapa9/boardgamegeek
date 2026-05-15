import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import ProfileLauncher from '@/components/ProfileLauncher';

export const metadata: Metadata = {
  title: 'boardgamegeek.be',
  description: 'Regel eenvoudig bordspelavonden en beheer je BoardGameGeek-collectie met vrienden.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <ProfileLauncher />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
