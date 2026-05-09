import { Suspense } from 'react';
import SessionApp from '@/components/SessionApp';

export default function SessionPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-4 py-8">Laden...</main>}>
      <SessionApp sessionId={params.id} />
    </Suspense>
  );
}
