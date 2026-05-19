import { Suspense } from 'react';
import SessionApp from '@/components/SessionApp';
import { createMetadata } from '@/lib/seo';

export const metadata = createMetadata({
  title: 'Spelavond uitnodiging',
  description: 'Vul je beschikbaarheid in en stem op spellen voor een gedeelde spelavond.',
  index: false
});

export default function SessionSlugPage({ params }: { params: { id: string; slug: string } }) {
  return (
    <Suspense fallback={<main className="app-shell"><div className="mx-auto max-w-4xl px-4 py-8"><div className="page-card p-5">Laden...</div></div></main>}>
      <SessionApp sessionId={params.id} />
    </Suspense>
  );
}
