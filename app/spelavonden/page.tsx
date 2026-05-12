import Link from 'next/link';
import { CalendarPlus, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatDisplayDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export default async function SessionsOverviewPage() {
  const sessions = await prisma.session.findMany({
    include: {
      dateOptions: { orderBy: { date: 'asc' } },
      _count: { select: { players: true, games: true } }
    }
  });

  const sortedSessions = [...sessions].sort((left, right) => {
    const leftSortKey = left.chosenDay ?? left.createdAt.toISOString().slice(0, 10);
    const rightSortKey = right.chosenDay ?? right.createdAt.toISOString().slice(0, 10);
    if (leftSortKey !== rightSortKey) return rightSortKey.localeCompare(leftSortKey);
    return right.createdAt.getTime() - left.createdAt.getTime();
  });

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
      <header className="rounded-3xl bg-white p-5 shadow-soft">
        <Link href="/" className="text-sm font-bold text-slate-500 underline">{'<-'} Terug naar start</Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Jouw spelavonden</h1>
        <p className="mt-2 text-slate-600">Overzicht van je eerdere spelmomenten, gesorteerd op meest recente datum.</p>
        <Link
          href="/spelavond?nieuw=1"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white"
        >
          <CalendarPlus size={18} />
          Nieuwe spelavond maken
        </Link>
      </header>

      <section className="rounded-3xl bg-white p-5 shadow-soft">
        {!sortedSessions.length && (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">Nog geen spelavonden gevonden.</p>
        )}

        {!!sortedSessions.length && (
          <div className="space-y-2">
            {sortedSessions.map((session) => {
              const dateSummary = session.chosenDay
                ? `Vastgelegd op ${formatDisplayDate(session.chosenDay)}`
                : `${session.dateOptions.length} voorgestelde datum${session.dateOptions.length === 1 ? '' : 's'}`;

              return (
                <Link
                  key={session.id}
                  href={`/s/${session.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-900">{session.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {dateSummary} - {session._count.players} deelnemer{session._count.players === 1 ? '' : 's'} - {session._count.games} spel{session._count.games === 1 ? '' : 'len'}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Aangemaakt op {formatDisplayDate(session.createdAt)}
                    </p>
                  </div>
                  <ChevronRight size={20} className="shrink-0 text-slate-500" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
