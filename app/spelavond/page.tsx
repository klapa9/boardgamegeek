import CreateSessionForm from '@/components/CreateSessionForm';
import BackToHomeButton from '@/components/BackToHomeButton';

export default function GameNightPage({ searchParams }: { searchParams?: { nieuw?: string; bewerk?: string } }) {
  const resetDraftOnLoad = searchParams?.nieuw === '1';
  const editSessionId = searchParams?.bewerk?.trim() || null;
  const isEditMode = Boolean(editSessionId);

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
        <section className="page-card page-card-peach p-6 md:p-10">
          <BackToHomeButton editSessionId={editSessionId} />
          <p className="page-chip mb-3 mt-4 w-fit">{isEditMode ? 'Spelavond wijzigen' : 'Nieuwe spelavond'}</p>
          <h1 className="font-poster text-4xl uppercase leading-none text-slate-950 md:text-6xl">Stap 1: Instellingen</h1>
          <CreateSessionForm mode="details" resetDraftOnLoad={resetDraftOnLoad} editSessionId={editSessionId} />
        </section>
      </div>
    </main>
  );
}
