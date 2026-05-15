import Link from 'next/link';
import BggManager from '@/components/BggManager';

export default function BggPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
        <header className="page-card page-card-lime p-5 sm:p-6">
          <Link href="/games" className="neo-button neo-button-ghost text-sm">&lt;- Terug naar mijn spellen</Link>
          <p className="page-chip mt-4 w-fit">BoardGameGeek</p>
          <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">BGG synchronisatie</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Koppel hier je BoardGameGeek account, start een sync op de achtergrond en bekijk welke lokale wijzigingen afwijken van BGG.
          </p>
        </header>

        <BggManager />
      </div>
    </main>
  );
}
