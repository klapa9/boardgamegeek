import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeSession } from '@/lib/serializers';

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function defaultDateOptions() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const collectionGameIds = Array.isArray(body.collection_game_ids) ? body.collection_game_ids.map(String) : [];
  const providedDates = Array.isArray(body.date_options) ? body.date_options.map(normalizeDate).filter(Boolean) as string[] : [];
  const dateOptions = Array.from(new Set(providedDates.length ? providedDates : defaultDateOptions())).sort();

  if (!title) return NextResponse.json({ error: 'Titel is verplicht.' }, { status: 400 });
  if (!dateOptions.length) return NextResponse.json({ error: 'Voeg minstens één datum toe.' }, { status: 400 });

  const collectionGames = collectionGameIds.length
    ? await prisma.collectionGame.findMany({ where: { id: { in: collectionGameIds }, hidden: false } })
    : [];

  const gamesFromCollection = collectionGames.map((game: { title: string; bggId: number | null; yearPublished: number | null; imageUrl: string | null; minPlayers: number | null; maxPlayers: number | null; playingTime: number | null; bggRating: number | null; bggWeight: number | null; mechanics: string[]; playMode: string | null; communityPlayers: number[] }) => ({
    title: game.title,
    bggId: game.bggId,
    yearPublished: game.yearPublished,
    imageUrl: game.imageUrl,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playingTime: game.playingTime,
    bggRating: game.bggRating,
    bggWeight: game.bggWeight,
    mechanics: game.mechanics,
    playMode: game.playMode,
    communityPlayers: game.communityPlayers
  }));

  const allGamesByTitle = new Map<string, { title: string; bggId?: number | null; yearPublished?: number | null; imageUrl?: string | null; minPlayers?: number | null; maxPlayers?: number | null; playingTime?: number | null; bggRating?: number | null; bggWeight?: number | null; mechanics?: string[]; playMode?: string | null; communityPlayers?: number[] }>();
  for (const game of gamesFromCollection) {
    allGamesByTitle.set(game.title.toLowerCase(), game);
  }

  const session = await prisma.session.create({
    data: {
      title,
      dateOptions: { create: dateOptions.map((date) => ({ date })) },
      games: { create: Array.from(allGamesByTitle.values()) }
    },
    include: { dateOptions: { orderBy: { date: 'asc' } } }
  });

  return NextResponse.json({ session: serializeSession(session, session.dateOptions), admin_token: session.adminToken });
}
