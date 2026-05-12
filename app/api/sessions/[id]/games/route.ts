import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeGame } from '@/lib/serializers';

type AddSessionGamesBody = {
  added_by?: unknown;
  collection_game_id?: unknown;
  collection_game_ids?: unknown;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => ({}))) as AddSessionGamesBody;
  const addedBy = String(body.added_by ?? '').trim();
  if (!addedBy) return NextResponse.json({ error: 'Je moet deelnemen om een spel toe te voegen.' }, { status: 403 });

  const player = await prisma.player.findFirst({
    where: { id: addedBy, sessionId: params.id }
  });
  if (!player) return NextResponse.json({ error: 'Alleen spelers van deze avond kunnen spellen toevoegen.' }, { status: 403 });

  const singleCollectionGameId = String(body.collection_game_id ?? '').trim();
  const collectionGameIds: string[] = Array.isArray(body.collection_game_ids)
    ? body.collection_game_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
    : singleCollectionGameId
      ? [singleCollectionGameId]
      : [];

  const uniqueCollectionGameIds: string[] = Array.from(new Set(collectionGameIds));
  if (!uniqueCollectionGameIds.length) return NextResponse.json({ error: 'Kies minstens één spel uit de gesynchroniseerde lijst.' }, { status: 400 });

  const collectionGames = await prisma.collectionGame.findMany({
    where: { id: { in: uniqueCollectionGameIds }, hidden: false }
  });
  if (!collectionGames.length) return NextResponse.json({ error: 'Geen van deze spellen staat in de gesynchroniseerde lijst.' }, { status: 404 });

  const existingGames = await prisma.game.findMany({ where: { sessionId: params.id } });
  const existingTitles = new Set(existingGames.map((game: { title: string }) => game.title.toLowerCase()));
  const existingBggIds = new Set(existingGames.map((game: { bggId: number | null }) => game.bggId).filter((id: number | null): id is number => id !== null));

  const skipped: string[] = [];
  const createData = collectionGames.flatMap((collectionGame: {
    title: string;
    bggId: number | null;
    yearPublished: number | null;
    imageUrl: string | null;
    minPlayers: number | null;
    maxPlayers: number | null;
    playingTime: number | null;
    bggRating: number | null;
    bggWeight: number | null;
    mechanics: string[];
    playMode: string | null;
    communityPlayers: number[];
  }) => {
    const duplicateByTitle = existingTitles.has(collectionGame.title.toLowerCase());
    const duplicateByBggId = collectionGame.bggId !== null && existingBggIds.has(collectionGame.bggId);
    if (duplicateByTitle || duplicateByBggId) {
      skipped.push(collectionGame.title);
      return [];
    }
    existingTitles.add(collectionGame.title.toLowerCase());
    if (collectionGame.bggId !== null) existingBggIds.add(collectionGame.bggId);
    return [{
      sessionId: params.id,
      title: collectionGame.title,
      bggId: collectionGame.bggId,
      yearPublished: collectionGame.yearPublished,
      imageUrl: collectionGame.imageUrl,
      minPlayers: collectionGame.minPlayers,
      maxPlayers: collectionGame.maxPlayers,
      playingTime: collectionGame.playingTime,
      bggRating: collectionGame.bggRating,
      bggWeight: collectionGame.bggWeight,
      mechanics: collectionGame.mechanics,
      playMode: collectionGame.playMode,
      communityPlayers: collectionGame.communityPlayers,
      addedBy
    }];
  });

  if (!createData.length) {
    if (singleCollectionGameId) return NextResponse.json({ error: 'Dit spel staat al in de lijst.' }, { status: 409 });
    return NextResponse.json({ added: [], skipped });
  }

  const added = await prisma.$transaction(
    createData.map((data: typeof createData[number]) => prisma.game.create({ data }))
  );

  if (singleCollectionGameId) return NextResponse.json({ game: serializeGame(added[0]) });
  return NextResponse.json({ added: added.map(serializeGame), skipped });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('game_id') ?? '';
  const adminToken = searchParams.get('admin_token') ?? '';
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
  if (adminToken !== session.adminToken) return NextResponse.json({ error: 'Alleen de organisator mag spellen verwijderen.' }, { status: 403 });

  const game = await prisma.game.findFirst({ where: { id: gameId, sessionId: params.id } });
  if (!game) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });
  await prisma.game.delete({ where: { id: gameId } });
  return NextResponse.json({ ok: true });
}
