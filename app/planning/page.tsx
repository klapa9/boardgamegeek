import CreateSessionForm from '@/components/CreateSessionForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PlanningPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
      <section className="rounded-3xl bg-white p-6 shadow-soft md:p-10">
        <Link href="/spelavond" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
          <ArrowLeft size={16} />
          Terug naar instellingen
        </Link>
        <p className="mb-3 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Nieuwe spelavond</p>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Stap 2: Planning</h1>
        <CreateSessionForm mode="planning" />
      </section>
    </main>
  );
}
