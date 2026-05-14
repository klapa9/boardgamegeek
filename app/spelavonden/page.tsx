import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { prisma } from '@/lib/db';
import { sessionPath } from '@/lib/session-link';
import SessionsOverviewList, { SessionOverviewListItem } from '@/components/SessionsOverviewList';
import { getCurrentUserProfile } from '@/lib/user-profile';

export const dynamic = 'force-dynamic';

export default async function SessionsOverviewPage() {
  const viewerProfile = await getCurrentUserProfile();
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      organizer: { select: { displayName: true } },
      dateOptions: { orderBy: { date: 'asc' }, select: { date: true } },
      games: { select: { id: true } },
      ratings: { select: { playerId: true, gameId: true } },
      availability: { select: { playerId: true, day: true, available: true } },
      _count: { select: { players: true, games: true } }
    }
  });

  const sessionItems: SessionOverviewListItem[] = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    isOrganizer: viewerProfile ? session.organizerUserProfileId === viewerProfile.id : false,
    organizerDisplayName: session.organizer?.displayName ?? null,
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
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 pb-16">
        <header className="page-card page-card-lime p-5 sm:p-6">
          <Link href="/" className="neo-button neo-button-ghost text-sm">{'<-'} Terug naar start</Link>
          <p className="page-chip mt-4 w-fit">Overzicht</p>
          <h1 className="mt-4 font-poster text-4xl uppercase leading-none text-slate-950 sm:text-5xl">Jouw spelavonden</h1>
          <p className="mt-3 text-slate-700">Overzicht van je eerdere spelmomenten, gesorteerd op aanmaakdatum met de nieuwste bovenaan.</p>
          <Link href="/spelavond?nieuw=1" className="neo-button neo-button-primary mt-5">
            <CalendarPlus size={18} />
            Nieuwe spelavond maken
          </Link>
        </header>

        <section className="page-card p-5">
          {!sessionItems.length && (
            <p className="neo-muted-panel text-center text-slate-500">Nog geen spelavonden gevonden.</p>
          )}

          {!!sessionItems.length && <SessionsOverviewList sessions={sessionItems} />}
        </section>
      </div>
    </main>
  );
}
