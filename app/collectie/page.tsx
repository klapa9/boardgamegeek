import Link from 'next/link';
import CollectionOverview from '@/components/CollectionOverview';

export default function CollectionPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
      <header className="rounded-3xl bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-bold text-slate-500 underline">← Terug naar start</Link>
          <Link
            href="/games"
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Synchroniseren
          </Link>
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Mijn collectie</h1>
        <p className="mt-2 text-slate-600">Hier zie je alle gesynchroniseerde spellen in één overzicht.</p>
      </header>
      <CollectionOverview />
    </main>
  );
}
