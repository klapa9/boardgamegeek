import { NextResponse } from 'next/server';
import { collectionGroupInclude } from '@/lib/collection-groups';
import { prisma } from '@/lib/db';
import { collectionGameInclude } from '@/lib/collection-games';
import { serializeCollectionGame, serializeCollectionGroup, serializeCollectionSyncState } from '@/lib/serializers';
import { getCurrentUserProfile } from '@/lib/user-profile';

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return null;

  return Array.from(new Set(
    value
      .map((entry) => String(entry).trim())
      .filter((entry): entry is string => entry.length > 0)
  ));
}

export async function GET() {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om je collectie te bekijken.' }, { status: 401 });
  }

  const [games, groups, syncState] = await Promise.all([
    prisma.collectionGame.findMany({
      include: collectionGameInclude,
      where: {
        userProfileId: viewerProfile.id,
        hidden: false
      },
      orderBy: { title: 'asc' }
    }),
    prisma.collectionGroup.findMany({
      include: collectionGroupInclude,
      where: { userProfileId: viewerProfile.id },
      orderBy: { name: 'asc' }
    }),
    prisma.collectionSyncState.findUnique({ where: { userProfileId: viewerProfile.id } })
  ]);

  return NextResponse.json({
    games: games.map(serializeCollectionGame),
    groups: groups.map(serializeCollectionGroup),
    sync_state: serializeCollectionSyncState(syncState) ?? {
      bgg_username: null,
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
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  if (!title) return NextResponse.json({ error: 'Spelnaam is verplicht.' }, { status: 400 });

  const duplicate = await prisma.collectionGame.findFirst({
    where: {
      userProfileId: viewerProfile.id,
      title: { equals: title, mode: 'insensitive' },
      hidden: false
    }
  });
  if (duplicate) return NextResponse.json({ error: 'Dit spel staat al in je lokale lijst.' }, { status: 409 });

  const game = await prisma.collectionGame.create({
    data: {
      userProfileId: viewerProfile.id,
      title,
      source: 'manual'
    }
  });
  const hydratedGame = await prisma.collectionGame.findUnique({
    where: { id: game.id },
    include: collectionGameInclude
  });

  return NextResponse.json({ game: hydratedGame ? serializeCollectionGame(hydratedGame) : null });
}

export async function PATCH(request: Request) {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Game id ontbreekt.' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const groupIds = normalizeIdList(body.group_ids);
  if (groupIds === null) return NextResponse.json({ error: 'group_ids moet een lijst zijn.' }, { status: 400 });

  const [game, groups] = await Promise.all([
    prisma.collectionGame.findFirst({
      where: {
        id,
        userProfileId: viewerProfile.id,
        hidden: false
      },
      select: { id: true }
    }),
    groupIds.length
      ? prisma.collectionGroup.findMany({
        where: {
          id: { in: groupIds },
          userProfileId: viewerProfile.id
        },
        select: { id: true }
      })
      : Promise.resolve([])
  ]);

  if (!game) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });
  if (groups.length !== groupIds.length) return NextResponse.json({ error: 'Niet elke indeling bestaat nog.' }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.collectionGroupGame.deleteMany({ where: { collectionGameId: id } });

    if (groupIds.length) {
      await tx.collectionGroupGame.createMany({
        data: groupIds.map((groupId) => ({ groupId, collectionGameId: id }))
      });
    }
  });

  return NextResponse.json({ ok: true, group_ids: groupIds });
}

export async function DELETE(request: Request) {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'Game id ontbreekt.' }, { status: 400 });

  const game = await prisma.collectionGame.findFirst({
    where: {
      id,
      userProfileId: viewerProfile.id,
      hidden: false
    },
    select: { id: true }
  });
  if (!game) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.collectionGroupGame.deleteMany({ where: { collectionGameId: id } });
    await tx.collectionGame.update({ where: { id }, data: { hidden: true } });
  });

  return NextResponse.json({ ok: true });
}

