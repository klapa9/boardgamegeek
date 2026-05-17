import Link from 'next/link';
import SessionCreatedOverview from '@/components/SessionCreatedOverview';

export default function SessionCreatedPage({ searchParams }: { searchParams?: { id?: string; bewerkt?: string } }) {
  const sessionId = searchParams?.id?.trim() || null;
  const isEdited = searchParams?.bewerkt === '1';

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
        <section className="page-card page-card-lime p-6 md:p-10">
          {sessionId ? (
            <SessionCreatedOverview sessionId={sessionId} isEdited={isEdited} />
          ) : (
            <div className="space-y-5">
              <p className="page-chip w-fit">{isEdited ? 'Spelavond gewijzigd' : 'Nieuwe spelavond'}</p>
              <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 md:text-6xl">
                Stap 4: Spelavond {isEdited ? 'gewijzigd' : 'aangemaakt'}
              </h1>
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                Er ontbreekt een spelavond om te tonen.
              </p>
              <Link href="/spelavonden" className="neo-button neo-button-primary w-full">
                Naar mijn spelavonden
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
