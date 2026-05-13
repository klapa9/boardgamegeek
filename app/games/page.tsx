import Link from 'next/link';
import CollectionManager from '@/components/CollectionManager';

export default function GamesPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
        <header className="page-card page-card-peach p-5 sm:p-6">
          <Link href="/" className="neo-button neo-button-ghost text-sm">&lt;- Terug naar start</Link>
          <p className="page-chip mt-4 w-fit">Collectiebeheer</p>
          <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">Collectie synchroniseren</h1>
          <p className="mt-3 text-slate-700">
            Synchroniseer hier je BGG collectie of voeg manueel spellen toe. Je overzicht vind je op de collectiepagina.
          </p>
        </header>

        <CollectionManager />
      </div>
    </main>
  );
}
