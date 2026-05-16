import { NextResponse } from 'next/server';
import { collectionGroupInclude } from '@/lib/collection-groups';
import { fetchBgg } from '@/lib/bgg-api';
import { parseThingDetails } from '@/lib/bgg-xml';
import { prisma } from '@/lib/db';
import { collectionGameInclude } from '@/lib/collection-games';
import { deriveCollectionPresentation } from '@/lib/collection-state';
import { ensureCollectionTaxonomyMaps, replaceCollectionGameTaxonomy } from '@/lib/collection-taxonomy';
import { preloadBggThumbnail } from '@/lib/image-cache';
import { asFilteredBggExpansionDtos, serializeCollectionGame, serializeCollectionGroup, serializeCollectionSyncState } from '@/lib/serializers';
import { getCurrentUserProfile } from '@/lib/user-profile';

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return null;

  return Array.from(new Set(
    value
      .map((entry) => String(entry).trim())
      .filter((entry): entry is string => entry.length > 0)
  ));
}

async function fetchBggGameDetails(bggId: number) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
  const response = await fetchBgg(url, { cache: 'no-store' }, 'collection-add');
  if (!response.ok) {
    throw new Error('BoardGameGeek details ophalen is mislukt.');
  }

  return parseThingDetails(await response.text()).find((game) => game.bggId === bggId) ?? null;
}

export async function GET() {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om je collectie te bekijken.' }, { status: 401 });
  }

  const [games, groups, syncState, addedGames, removedGames] = await Promise.all([
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
    prisma.collectionSyncState.findUnique({ where: { userProfileId: viewerProfile.id } }),
    prisma.collectionGame.findMany({
      include: collectionGameInclude,
      where: {
        userProfileId: viewerProfile.id,
        manuallyAdded: true,
        inBggCollection: false
      },
      orderBy: { title: 'asc' }
    }),
    prisma.collectionGame.findMany({
      include: collectionGameInclude,
      where: {
        userProfileId: viewerProfile.id,
        manuallyRemoved: true,
        inBggCollection: true
      },
      orderBy: { title: 'asc' }
    })
  ]);

  return NextResponse.json({
    games: games.map(serializeCollectionGame),
    groups: groups.map(serializeCollectionGroup),
    added_games: addedGames.map(serializeCollectionGame),
    removed_games: removedGames.map(serializeCollectionGame),
    filtered_bgg_expansions: asFilteredBggExpansionDtos(syncState?.filteredBggExpansions),
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
  const rawBggId = Number(body.bgg_id);
  if (!Number.isFinite(rawBggId)) {
    return NextResponse.json({ error: 'Kies eerst een spel uit de BGG zoekresultaten.' }, { status: 400 });
  }

  const details = await fetchBggGameDetails(rawBggId);
  if (!details) {
    return NextResponse.json({ error: 'Spel niet gevonden op BoardGameGeek.' }, { status: 404 });
  }

  const duplicate = await prisma.collectionGame.findFirst({
    where: {
      userProfileId: viewerProfile.id,
      bggId: rawBggId,
      hidden: false
    },
    select: { id: true }
  });
  if (duplicate) return NextResponse.json({ error: 'Dit spel staat al in je collectie.' }, { status: 409 });

  const now = new Date();
  const savedId = await prisma.$transaction(async (tx) => {
    const existing = await tx.collectionGame.findUnique({
      where: {
        userProfileId_bggId: {
          userProfileId: viewerProfile.id,
          bggId: rawBggId
        }
      },
      select: {
        id: true,
        inBggCollection: true,
        manuallyAdded: true,
        manuallyRemoved: true
      }
    });
    const nextState = {
      inBggCollection: existing?.inBggCollection ?? false,
      manuallyAdded: true,
      manuallyRemoved: false
    };
    const presentation = deriveCollectionPresentation(nextState);
    const taxonomyMaps = await ensureCollectionTaxonomyMaps(tx, [details]);

    const savedGame = existing
      ? await tx.collectionGame.update({
        where: { id: existing.id },
        data: {
          title: details.title,
          yearPublished: details.yearPublished,
          thumbnailUrl: details.thumbnailUrl,
          imageUrl: details.imageUrl,
          minPlayers: details.minPlayers,
          maxPlayers: details.maxPlayers,
          playingTime: details.playingTime,
          minAge: details.minAge,
          bggRating: details.bggRating,
          bggBayesRating: details.bggBayesRating,
          bggWeight: details.bggWeight,
          designers: details.designers,
          playMode: details.playMode,
          communityPlayers: details.communityPlayers,
          playerCountPoll: details.playerCountPoll,
          ranks: details.ranks,
          inBggCollection: nextState.inBggCollection,
          manuallyAdded: nextState.manuallyAdded,
          manuallyRemoved: nextState.manuallyRemoved,
          hidden: presentation.hidden,
          source: presentation.source,
          lastSyncedAt: now
        }
      })
      : await tx.collectionGame.create({
        data: {
          userProfileId: viewerProfile.id,
          bggId: details.bggId,
          title: details.title,
          yearPublished: details.yearPublished,
          thumbnailUrl: details.thumbnailUrl,
          imageUrl: details.imageUrl,
          minPlayers: details.minPlayers,
          maxPlayers: details.maxPlayers,
          playingTime: details.playingTime,
          minAge: details.minAge,
          bggRating: details.bggRating,
          bggBayesRating: details.bggBayesRating,
          bggWeight: details.bggWeight,
          designers: details.designers,
          playMode: details.playMode,
          communityPlayers: details.communityPlayers,
          playerCountPoll: details.playerCountPoll,
          ranks: details.ranks,
          inBggCollection: nextState.inBggCollection,
          manuallyAdded: nextState.manuallyAdded,
          manuallyRemoved: nextState.manuallyRemoved,
          hidden: presentation.hidden,
          source: presentation.source,
          lastSyncedAt: now
        }
      });

    await replaceCollectionGameTaxonomy(tx, savedGame.id, details, taxonomyMaps);
    return savedGame.id;
  });

  await preloadBggThumbnail(details.bggId, details.thumbnailUrl ?? details.imageUrl);

  const hydratedGame = await prisma.collectionGame.findUnique({
    where: { id: savedId },
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
    select: {
      id: true,
      inBggCollection: true
    }
  });
  if (!game) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.collectionGroupGame.deleteMany({ where: { collectionGameId: id } });

    const nextState = game.inBggCollection
      ? {
        inBggCollection: true,
        manuallyAdded: false,
        manuallyRemoved: true
      }
      : {
        inBggCollection: false,
        manuallyAdded: false,
        manuallyRemoved: false
      };
    const presentation = deriveCollectionPresentation(nextState);

    await tx.collectionGame.update({
      where: { id },
      data: {
        inBggCollection: nextState.inBggCollection,
        manuallyAdded: nextState.manuallyAdded,
        manuallyRemoved: nextState.manuallyRemoved,
        hidden: presentation.hidden,
        source: presentation.source
      }
    });
  });

  return NextResponse.json({ ok: true });
}

