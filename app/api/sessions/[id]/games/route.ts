import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bggThingDetailsToSessionGameData, collectionGameInclude, collectionGameToSessionGameData } from '@/lib/collection-games';
import { fetchSingleBggGameDetail } from '@/lib/bgg-game-details';
import { normalizeGeekType } from '@/lib/geek-types';
import { serializeGame } from '@/lib/serializers';
import { ensureSessionOrganizerAccess } from '@/lib/session-organizer';
import { getCurrentUserProfile } from '@/lib/user-profile';
import { authorizePlayerAccess } from '@/lib/guest-access';

type AddSessionGamesBody = {
  added_by?: unknown;
  collection_game_id?: unknown;
  collection_game_ids?: unknown;
  bgg_id?: unknown;
  geek_type?: unknown;
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = (await request.json().catch(() => ({}))) as AddSessionGamesBody;
  const addedBy = String(body.added_by ?? '').trim();
  if (!addedBy) return NextResponse.json({ error: 'Je moet deelnemen om een spel toe te voegen.' }, { status: 403 });

  const access = await authorizePlayerAccess(params.id, addedBy);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const singleCollectionGameId = String(body.collection_game_id ?? '').trim();
  const collectionGameIds: string[] = Array.isArray(body.collection_game_ids)
    ? body.collection_game_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
    : singleCollectionGameId
      ? [singleCollectionGameId]
      : [];
  const rawBggId = Number(body.bgg_id);
  const geekType = normalizeGeekType(body.geek_type);
  const requestedBggId = Number.isFinite(rawBggId) ? rawBggId : null;
  const existingGames = await prisma.game.findMany({ where: { sessionId: params.id } });
  const existingTitles = new Set(existingGames.map((game) => game.title.toLowerCase()));
  const existingBggIds = new Set(existingGames.map((game) => game.bggId).filter((id): id is number => id !== null));

  if (!collectionGameIds.length && requestedBggId !== null) {
    const details = await fetchSingleBggGameDetail(requestedBggId, 'session-add-bgg', geekType);
    if (!details) {
      return NextResponse.json({
        error: geekType === 'rpg'
          ? 'Volledige RPG niet gevonden op RPGGeek.'
          : 'Spel niet gevonden op BoardGameGeek.'
      }, { status: 404 });
    }

    const duplicateByTitle = existingTitles.has(details.title.toLowerCase());
    const duplicateByBggId = existingBggIds.has(details.bggId);
    if (duplicateByTitle || duplicateByBggId) {
      return NextResponse.json({ error: 'Dit spel staat al in de lijst.' }, { status: 409 });
    }

    const added = await prisma.game.create({
      data: {
        sessionId: params.id,
        ...bggThingDetailsToSessionGameData(details),
        addedBy
      }
    });

    return NextResponse.json({ game: serializeGame(added) });
  }

  const uniqueCollectionGameIds = Array.from(new Set(collectionGameIds));
  if (!uniqueCollectionGameIds.length) {
    return NextResponse.json({ error: 'Kies minstens 1 spel.' }, { status: 400 });
  }

  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Log eerst in om spellen uit je collectie toe te voegen.' }, { status: 401 });
  }

  const collectionGames = await prisma.collectionGame.findMany({
    include: collectionGameInclude,
    where: {
      id: { in: uniqueCollectionGameIds },
      userProfileId: viewerProfile.id,
      hidden: false
    }
  });
  if (!collectionGames.length) return NextResponse.json({ error: 'Geen van deze spellen staat in de gesynchroniseerde lijst.' }, { status: 404 });

  const skipped: string[] = [];
  const createData = collectionGames.flatMap((collectionGame) => {
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
      ...collectionGameToSessionGameData(collectionGame),
      addedBy
    }];
  });

  if (!createData.length) {
    if (singleCollectionGameId) return NextResponse.json({ error: 'Dit spel staat al in de lijst.' }, { status: 409 });
    return NextResponse.json({ added: [], skipped });
  }

  const added = await prisma.$transaction(
    createData.map((data) => prisma.game.create({ data }))
  );

  if (singleCollectionGameId) return NextResponse.json({ game: serializeGame(added[0]) });
  return NextResponse.json({ added: added.map(serializeGame), skipped });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get('game_id') ?? '';
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true, organizerUserProfileId: true }
  });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
  const access = await ensureSessionOrganizerAccess(session);
  if (!access.ok) return NextResponse.json({ error: 'Alleen de organisator mag spellen verwijderen.' }, { status: 403 });

  const game = await prisma.game.findFirst({ where: { id: gameId, sessionId: params.id } });
  if (!game) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });
  await prisma.game.delete({ where: { id: gameId } });
  return NextResponse.json({ ok: true });
}

