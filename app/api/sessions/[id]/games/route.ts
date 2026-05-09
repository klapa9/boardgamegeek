import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeGame } from '@/lib/serializers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const addedBy = String(body.added_by ?? '').trim();
  if (!addedBy) return NextResponse.json({ error: 'Je moet deelnemen om een spel toe te voegen.' }, { status: 403 });

  const player = await prisma.player.findFirst({
    where: { id: addedBy, sessionId: params.id }
  });
  if (!player) return NextResponse.json({ error: 'Alleen spelers van deze avond kunnen spellen toevoegen.' }, { status: 403 });

  const collectionGameId = String(body.collection_game_id ?? '').trim();
  if (!collectionGameId) return NextResponse.json({ error: 'Kies een spel uit de gesynchroniseerde lijst.' }, { status: 400 });

  const collectionGame = await prisma.collectionGame.findFirst({
    where: { id: collectionGameId, hidden: false }
  });
  if (!collectionGame) return NextResponse.json({ error: 'Spel niet gevonden in de gesynchroniseerde lijst.' }, { status: 404 });

  const duplicate = await prisma.game.findFirst({
    where: { sessionId: params.id, title: { equals: collectionGame.title, mode: 'insensitive' } }
  });
  if (duplicate) return NextResponse.json({ error: 'Dit spel staat al in de lijst.' }, { status: 409 });

  const game = await prisma.game.create({
    data: {
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
    }
  });

  return NextResponse.json({ game: serializeGame(game) });
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
