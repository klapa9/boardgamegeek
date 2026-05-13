import CreateSessionForm from '@/components/CreateSessionForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PlanningPage({ searchParams }: { searchParams?: { bewerk?: string } }) {
  const editSessionId = searchParams?.bewerk?.trim() || null;
  const settingsHref = editSessionId ? `/spelavond?bewerk=${editSessionId}` : '/spelavond';
  const isEditMode = Boolean(editSessionId);

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
        <section className="page-card page-card-lime p-6 md:p-10">
          <Link href={settingsHref} className="neo-button neo-button-ghost text-sm">
            <ArrowLeft size={16} />
            Terug naar instellingen
          </Link>
          <p className="page-chip mb-3 mt-4 w-fit">{isEditMode ? 'Spelavond wijzigen' : 'Nieuwe spelavond'}</p>
          <h1 className="font-poster text-4xl uppercase leading-none text-slate-950 md:text-6xl">Stap 2: Planning</h1>
          <CreateSessionForm mode="planning" editSessionId={editSessionId} />
        </section>
      </div>
    </main>
  );
}
