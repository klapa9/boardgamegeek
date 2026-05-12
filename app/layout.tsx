import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gezelschapsspelkiezer',
  description: 'Kies simpel een datum en gezelschapsspel met vrienden.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
