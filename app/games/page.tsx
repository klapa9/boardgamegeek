import Image from 'next/image';
import Link from 'next/link';
import CollectionManager from '@/components/CollectionManager';

export default function GamesPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
        <header className="page-card page-card-peach p-5 sm:p-6">
          <Link href="/" className="neo-button neo-button-ghost text-sm">&lt;- Terug naar start</Link>
          <p className="page-chip mt-4 w-fit">Collectiebeheer</p>
          <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">Mijn spellen</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Je kan hier spellen toevoegen of verwijderen. Als je een boardgamegeek.com account hebt kan je ook je collectie synchronizeren.
          </p>
          <Link
            href="/bgg"
            className="mt-4 inline-flex items-center gap-3 rounded-2xl border-2 border-slate-950 bg-[#0077cc] px-4 py-3 text-sm font-bold text-white shadow-[0_4px_0_0_#0f172a] transition hover:-translate-y-0.5 hover:bg-[#0b84d9]"
          >
            <Image
              src="/boardgamegeek-logo.png"
              alt="Official BoardGameGeek.com logo"
              width={108}
              height={28}
              className="h-7 w-auto"
            />
            <span>Synchronisatie</span>
          </Link>
        </header>

        <CollectionManager />
      </div>
    </main>
  );
}
