import './globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import ProfileLauncher from '@/components/ProfileLauncher';

export const metadata: Metadata = {
  title: 'boardgamegeek.be',
  description: 'Regel eenvoudig bordspelavonden en beheer je BoardGameGeek-collectie met vrienden.'
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
