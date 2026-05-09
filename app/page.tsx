import CreateSessionForm from '@/components/CreateSessionForm';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8">
      <section className="rounded-3xl bg-white p-6 shadow-soft md:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Gezellige gezelschapsspelgroep</p>
        <h1 className="text-3xl font-black tracking-tight md:text-5xl">Kies je spellenlijst</h1>
        <CreateSessionForm />
      </section>
      <p className="mt-5 text-center text-sm text-slate-500">spellen komen uit de bgg collectie van gezelschapspelgroep.</p>
    </main>
  );
}
