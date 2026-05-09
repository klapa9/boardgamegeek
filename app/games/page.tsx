import Link from 'next/link';
import CollectionManager from '@/components/CollectionManager';

export default function GamesPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
      <header className="rounded-3xl bg-white p-5 shadow-soft">
        <Link href="/" className="text-sm font-bold text-slate-500 underline">← Terug naar start</Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Mijn spellen</h1>
        <p className="mt-2 text-slate-600">Synchroniseer hier je BGG collectie of voeg manueel spellen toe. Spelavonden kiezen daarna uit deze lokale lijst.</p>
      </header>
      <CollectionManager />
    </main>
  );
}
