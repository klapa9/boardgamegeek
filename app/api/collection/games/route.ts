import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { collectionGameInclude } from '@/lib/collection-games';
import { DEFAULT_BGG_USERNAME } from '@/lib/defaults';
import { serializeCollectionGame, serializeCollectionSyncState } from '@/lib/serializers';

export async function GET() {
  const [games, syncState] = await Promise.all([
    prisma.collectionGame.findMany({
      include: collectionGameInclude,
      where: { hidden: false },
      orderBy: { title: 'asc' }
    }),
    prisma.collectionSyncState.findUnique({ where: { id: 'default' } })
  ]);

  return NextResponse.json({
    games: games.map(serializeCollectionGame),
    sync_state: serializeCollectionSyncState(syncState) ?? {
      bgg_username: DEFAULT_BGG_USERNAME,
      last_synced_at: null,
      last_status: null,
      sync_in_progress: false,
      sync_started_at: null,
      sync_finished_at: null,
      total_games: 0,
      processed_games: 0
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Spelnaam is verplicht.' }, { status: 400 });

  const duplicate = await prisma.collectionGame.findFirst({ where: { title: { equals: title, mode: 'insensitive' }, hidden: false } });
  if (duplicate) return NextResponse.json({ error: 'Dit spel staat al in je lokale lijst.' }, { status: 409 });

  const game = await prisma.collectionGame.create({ data: { title, source: 'manual' } });
  const hydratedGame = await prisma.collectionGame.findUnique({
    where: { id: game.id },
    include: collectionGameInclude
  });

  return NextResponse.json({ game: hydratedGame ? serializeCollectionGame(hydratedGame) : null });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Game id ontbreekt.' }, { status: 400 });

  await prisma.collectionGame.update({ where: { id }, data: { hidden: true } });
  return NextResponse.json({ ok: true });
}

