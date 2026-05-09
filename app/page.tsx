import Link from 'next/link';
import CreateSessionForm from '@/components/CreateSessionForm';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
      <section className="rounded-3xl bg-white p-6 shadow-soft md:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Gezelschapsspelkiezer</p>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Kies eerst je spellenlijst, daarna pas je spelavond.</h1>
        <p className="mt-4 text-slate-600 md:text-lg">
          Synchroniseer je BGG collectie vooraf in <b>Mijn spellen</b>. Bij het aanmaken van een spelavond kies je gewoon uit die lokale lijst.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/games" className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-bold hover:bg-slate-50">Mijn spellen beheren</Link>
        </div>
        <CreateSessionForm />
      </section>
      <p className="mt-5 text-center text-sm text-slate-500">Geen BGG-live-search tijdens een spelavond. Alles komt uit je lokale collectie.</p>
    </main>
  );
}
