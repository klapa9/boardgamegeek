import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeGame } from '@/lib/serializers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Spelnaam is verplicht.' }, { status: 400 });

  const addedBy = String(body.added_by ?? '').trim();
  if (!addedBy) return NextResponse.json({ error: 'Je moet deelnemen om een spel toe te voegen.' }, { status: 403 });

  const player = await prisma.player.findFirst({
    where: { id: addedBy, sessionId: params.id }
  });
  if (!player) return NextResponse.json({ error: 'Alleen spelers van deze avond kunnen spellen toevoegen.' }, { status: 403 });

  const duplicate = await prisma.game.findFirst({
    where: { sessionId: params.id, title: { equals: title, mode: 'insensitive' } }
  });
  if (duplicate) return NextResponse.json({ error: 'Dit spel staat al in de lijst.' }, { status: 409 });

  const game = await prisma.game.create({
    data: {
      sessionId: params.id,
      title,
      bggId: typeof body.bgg_id === 'number' ? body.bgg_id : null,
      yearPublished: typeof body.year_published === 'number' ? body.year_published : null,
      imageUrl: body.image_url ?? null,
      minPlayers: typeof body.min_players === 'number' ? body.min_players : null,
      maxPlayers: typeof body.max_players === 'number' ? body.max_players : null,
      playingTime: typeof body.playing_time === 'number' ? body.playing_time : null,
      bggRating: typeof body.bgg_rating === 'number' ? body.bgg_rating : null,
      bggWeight: typeof body.bgg_weight === 'number' ? body.bgg_weight : null,
      mechanics: Array.isArray(body.mechanics) ? body.mechanics.map(String) : [],
      playMode: body.play_mode === 'cooperative' || body.play_mode === 'competitive' ? body.play_mode : null,
      communityPlayers: Array.isArray(body.community_players) ? body.community_players.map(Number).filter(Number.isInteger) : [],
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
