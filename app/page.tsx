import Link from 'next/link';
import { CalendarPlus, ExternalLink, History, Library } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-8">
      <section className="rounded-3xl bg-white p-6 shadow-soft md:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">boardgamegeek.be</p>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Wat wil je doen?</h1>
        <div className="mt-8 grid gap-3">
          <a
            href="https://boardgamegeek.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-950 transition hover:border-slate-300 hover:bg-white"
          >
            <span>Ga naar boardgamegeek.com</span>
            <ExternalLink size={20} />
          </a>
          <Link
            href="/games"
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-950 transition hover:border-slate-300 hover:bg-white"
          >
            <span>Bekijk mijn collectie</span>
            <Library size={20} />
          </Link>
          <Link
            href="/spelavonden"
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-950 transition hover:border-slate-300 hover:bg-white"
          >
            <span>Bekijk jouw spelavonden</span>
            <History size={20} />
          </Link>
          <Link
            href="/spelavond?nieuw=1"
            className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white transition hover:bg-slate-800"
          >
            <span>Maak een spelavond aan</span>
            <CalendarPlus size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}
