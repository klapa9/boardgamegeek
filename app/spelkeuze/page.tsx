import CreateSessionForm from '@/components/CreateSessionForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function GameSelectionPage({ searchParams }: { searchParams?: { bewerk?: string } }) {
  const editSessionId = searchParams?.bewerk?.trim() || null;
  const planningHref = editSessionId ? `/planning?bewerk=${editSessionId}` : '/planning';
  const isEditMode = Boolean(editSessionId);

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
        <section className="page-card page-card-sky p-6 md:p-10">
          <Link href={planningHref} className="neo-button neo-button-ghost text-sm">
            <ArrowLeft size={16} />
            Terug naar planning
          </Link>
          <p className="page-chip mb-3 mt-4 w-fit">{isEditMode ? 'Spelavond wijzigen' : 'Nieuwe spelavond'}</p>
          <h1 className="font-poster text-4xl uppercase leading-none text-slate-950 md:text-6xl">Stap 3: Spelkeuze</h1>
          <CreateSessionForm mode="games" editSessionId={editSessionId} />
        </section>
      </div>
    </main>
  );
}
