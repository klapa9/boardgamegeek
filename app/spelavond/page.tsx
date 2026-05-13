import CreateSessionForm from '@/components/CreateSessionForm';
import BackToHomeButton from '@/components/BackToHomeButton';

export default function GameNightPage({ searchParams }: { searchParams?: { nieuw?: string; bewerk?: string } }) {
  const resetDraftOnLoad = searchParams?.nieuw === '1';
  const editSessionId = searchParams?.bewerk?.trim() || null;
  const isEditMode = Boolean(editSessionId);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
      <section className="rounded-3xl bg-white p-6 shadow-soft md:p-10">
        <BackToHomeButton editSessionId={editSessionId} />
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{isEditMode ? 'Spelavond wijzigen' : 'Nieuwe spelavond'}</p>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Stap 1: Instellingen</h1>
        <CreateSessionForm mode="details" resetDraftOnLoad={resetDraftOnLoad} editSessionId={editSessionId} />
      </section>
    </main>
  );
}
