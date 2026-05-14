import Link from 'next/link';
import CollectionOverview from '@/components/CollectionOverview';

export default function CollectionPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
        <header className="page-card page-card-sky p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="neo-button neo-button-ghost text-sm">&lt;- Terug naar start</Link>
            <div className="flex flex-wrap gap-2">
              <Link href="#nieuwe-groep" className="neo-button neo-button-ghost text-sm">
                + Nieuw
              </Link>
              <Link href="/games" className="neo-button neo-button-primary text-sm">
                Synchroniseren
              </Link>
            </div>
          </div>
          <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">Mijn collectie</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Bouw hier je eigen groepen bovenop je collectie en open per groep meteen de juiste spellenlijst.
          </p>
        </header>

        <CollectionOverview />
      </div>
    </main>
  );
}
