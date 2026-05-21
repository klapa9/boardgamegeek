import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import SessionApp from '@/components/SessionApp';
import { prisma } from '@/lib/db';
import { createMetadata } from '@/lib/seo';
import { sessionPath } from '@/lib/session-link';

export const metadata = createMetadata({
  title: 'Spelavond uitnodiging',
  description: 'Vul je beschikbaarheid in en stem op spellen voor een gedeelde spelavond.',
  index: false
});

export const dynamic = 'force-dynamic';

export default async function SessionPage({ params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { title: true }
  });
  const canonicalPath = sessionPath(params.id, session?.title);

  if (canonicalPath !== `/s/${params.id}`) {
    redirect(canonicalPath);
  }

  return (
    <Suspense fallback={<main className="app-shell"><div className="mx-auto max-w-4xl px-4 py-8"><div className="page-card p-5">Laden...</div></div></main>}>
      <SessionApp sessionId={params.id} />
    </Suspense>
  );
}
