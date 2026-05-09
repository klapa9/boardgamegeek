import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeSession } from '@/lib/serializers';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const collectionGameIds = Array.isArray(body.collection_game_ids) ? body.collection_game_ids.map(String) : [];
  const manualGames = Array.isArray(body.manual_games) ? body.manual_games : [];

  if (!title) return NextResponse.json({ error: 'Titel is verplicht.' }, { status: 400 });

  const collectionGames = collectionGameIds.length
    ? await prisma.collectionGame.findMany({ where: { id: { in: collectionGameIds }, hidden: false } })
    : [];

  const gamesFromCollection = collectionGames.map((game) => ({
    title: game.title,
    bggId: game.bggId,
    yearPublished: game.yearPublished,
    imageUrl: game.imageUrl,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playingTime: game.playingTime,
    bggRating: game.bggRating,
    bggWeight: game.bggWeight
  }));

  const gamesFromManual = manualGames
    .map((name: unknown) => String(name ?? '').trim())
    .filter(Boolean)
    .map((name: string) => ({ title: name }));

  const allGamesByTitle = new Map<string, { title: string; bggId?: number | null; yearPublished?: number | null; imageUrl?: string | null; minPlayers?: number | null; maxPlayers?: number | null; playingTime?: number | null; bggRating?: number | null; bggWeight?: number | null }>();
  for (const game of [...gamesFromCollection, ...gamesFromManual]) {
    allGamesByTitle.set(game.title.toLowerCase(), game);
  }

  const session = await prisma.session.create({
    data: {
      title,
      games: { create: Array.from(allGamesByTitle.values()) }
    }
  });

  return NextResponse.json({ session: serializeSession(session), admin_token: session.adminToken });
}
