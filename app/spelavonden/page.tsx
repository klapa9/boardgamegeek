import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { prisma } from '@/lib/db';
import { sessionPath } from '@/lib/session-link';
import SessionsOverviewList, { SessionOverviewListItem } from '@/components/SessionsOverviewList';

export const dynamic = 'force-dynamic';

export default async function SessionsOverviewPage() {
  const sessions = await prisma.session.findMany({
    include: {
      dateOptions: { orderBy: { date: 'asc' }, select: { date: true } },
      games: { select: { id: true } },
      ratings: { select: { playerId: true, gameId: true } },
      availability: { select: { playerId: true, day: true, available: true } },
      _count: { select: { players: true, games: true } }
    }
  });

  const sortedSessions = [...sessions].sort((left, right) => {
    const leftSortKey = left.chosenDay ?? left.createdAt.toISOString().slice(0, 10);
    const rightSortKey = right.chosenDay ?? right.createdAt.toISOString().slice(0, 10);
    if (leftSortKey !== rightSortKey) return rightSortKey.localeCompare(leftSortKey);
    return right.createdAt.getTime() - left.createdAt.getTime();
  });
  const sessionItems: SessionOverviewListItem[] = sortedSessions.map((session) => ({
    id: session.id,
    title: session.title,
    chosenDay: session.chosenDay,
    createdAt: session.createdAt.toISOString(),
    dateOptions: session.dateOptions.map((option) => option.date),
    playersCount: session._count.players,
    gamesCount: session._count.games,
    path: sessionPath(session.id, session.title),
    games: session.games.map((game) => ({ id: game.id })),
    ratings: session.ratings.map((rating) => ({ playerId: rating.playerId, gameId: rating.gameId })),
    availability: session.availability.map((item) => ({ playerId: item.playerId, day: item.day, available: item.available }))
  }));

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
        {!sessionItems.length && (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">Nog geen spelavonden gevonden.</p>
        )}

        {!!sessionItems.length && <SessionsOverviewList sessions={sessionItems} />}
      </section>
    </main>
  );
}
