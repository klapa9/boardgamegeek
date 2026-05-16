import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { CollectionSeed, BggThingDetails, parseCollectionSeeds, parseThingDetails } from '@/lib/bgg-xml';
import { fetchBgg } from '@/lib/bgg-api';
import { deriveCollectionPresentation } from '@/lib/collection-state';
import { ensureCollectionTaxonomyMaps, replaceCollectionGameTaxonomy } from '@/lib/collection-taxonomy';
import { preloadBggThumbnail } from '@/lib/image-cache';

const BGG_REQUEST_TIMEOUT_MS = 30000;
const BGG_THING_BATCH_SIZE = 20;
const BGG_COLLECTION_RETRY_DELAYS_MS = [3000, 5000, 8000, 12000];
const BGG_THING_RETRY_DELAYS_MS = [1500, 3000, 5000];
const BGG_THING_DELAY_MS = 1250;

export const BGG_COLLECTION_PENDING_MESSAGE = 'BGG is je collectie aan het voorbereiden. De sync draait later verder zodra de collectie beschikbaar is.';
export const BGG_AUTH_ERROR_MESSAGE = 'BoardGameGeek weigert de publieke collectie-aanvraag.';
export const BGG_TEMPORARY_ERROR_MESSAGE = 'BoardGameGeek is tijdelijk niet bereikbaar. Probeer het straks opnieuw.';

export type StartCollectionSyncResult = {
  started: boolean;
  pending: boolean;
  message: string;
};

const activeSyncPromises = new Map<string, Promise<void>>();
type SyncStatePatch = Partial<Prisma.CollectionSyncStateUncheckedCreateInput>;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toThingFallback(seed: CollectionSeed): BggThingDetails {
  return {
    bggId: seed.bggId,
    itemType: 'boardgame',
    title: seed.title,
    yearPublished: seed.yearPublished,
    thumbnailUrl: null,
    imageUrl: null,
    minPlayers: null,
    maxPlayers: null,
    playingTime: null,
    minAge: null,
    bggRating: null,
    bggBayesRating: null,
    bggWeight: null,
    mechanics: [],
    categories: [],
    designers: [],
    playMode: null,
    communityPlayers: [],
    playerCountPoll: [],
    ranks: []
  };
}

async function updateSyncState(userProfileId: string, data: SyncStatePatch) {
  await prisma.collectionSyncState.upsert({
    where: { userProfileId },
    create: {
      userProfileId,
      ...data
    },
    update: data
  });
}

async function fetchCollectionSeedsFromBgg(username: string): Promise<{ pending: boolean; seeds: CollectionSeed[] }> {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= BGG_COLLECTION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchBgg(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS)
      }, 'collection');
      const body = await response.text();

      if (response.status === 202) {
        if (attempt < BGG_COLLECTION_RETRY_DELAYS_MS.length) {
          await delay(BGG_COLLECTION_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        return { pending: true, seeds: [] };
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(BGG_AUTH_ERROR_MESSAGE);
      }

      if (response.status === 429 || response.status >= 500) {
        throw new Error(BGG_TEMPORARY_ERROR_MESSAGE);
      }

      if (!response.ok) {
        throw new Error(`BGG gaf HTTP ${response.status}: ${body.slice(0, 160)}`);
      }

      return { pending: false, seeds: parseCollectionSeeds(body) };
    } catch (error) {
      lastError = error;
      if (attempt < BGG_COLLECTION_RETRY_DELAYS_MS.length) {
        await delay(BGG_COLLECTION_RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(BGG_TEMPORARY_ERROR_MESSAGE);
}

async function fetchThingBatch(ids: number[]): Promise<BggThingDetails[]> {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids.join(',')}&stats=1`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= BGG_THING_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetchBgg(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS)
      }, 'thing-batch');
      const body = await response.text();

      if (response.status === 429 || response.status >= 500) {
        throw new Error(BGG_TEMPORARY_ERROR_MESSAGE);
      }

      if (!response.ok) {
        throw new Error(`BGG thing gaf HTTP ${response.status}: ${body.slice(0, 160)}`);
      }

      return parseThingDetails(body);
    } catch (error) {
      lastError = error;
      if (attempt < BGG_THING_RETRY_DELAYS_MS.length) {
        await delay(BGG_THING_RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(BGG_TEMPORARY_ERROR_MESSAGE);
}

async function persistCollectionGames(userProfileId: string, username: string, games: BggThingDetails[]) {
  const now = new Date();
  const ownedBggIds = games.map((game) => game.bggId);

  await prisma.$transaction(async (tx) => {
    const taxonomyMaps = await ensureCollectionTaxonomyMaps(tx, games);

    for (const game of games) {
      const existing = await tx.collectionGame.findUnique({
        where: {
          userProfileId_bggId: {
            userProfileId,
            bggId: game.bggId
          }
        },
        select: {
          manuallyAdded: true,
          manuallyRemoved: true
        }
      });
      const nextState = {
        inBggCollection: true,
        manuallyAdded: existing?.manuallyAdded ?? false,
        manuallyRemoved: existing?.manuallyRemoved ?? false
      };
      const presentation = deriveCollectionPresentation(nextState);

      const savedGame = await tx.collectionGame.upsert({
        where: {
          userProfileId_bggId: {
            userProfileId,
            bggId: game.bggId
          }
        },
        create: {
          userProfileId,
          bggId: game.bggId,
          title: game.title,
          yearPublished: game.yearPublished,
          thumbnailUrl: game.thumbnailUrl,
          imageUrl: game.imageUrl,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          playingTime: game.playingTime,
          minAge: game.minAge,
          bggRating: game.bggRating,
          bggBayesRating: game.bggBayesRating,
          bggWeight: game.bggWeight,
          designers: game.designers,
          playMode: game.playMode,
          communityPlayers: game.communityPlayers,
          playerCountPoll: game.playerCountPoll as Prisma.InputJsonValue,
          ranks: game.ranks as Prisma.InputJsonValue,
          inBggCollection: nextState.inBggCollection,
          manuallyAdded: nextState.manuallyAdded,
          manuallyRemoved: nextState.manuallyRemoved,
          hidden: presentation.hidden,
          source: presentation.source,
          lastSyncedAt: now
        },
        update: {
          title: game.title,
          yearPublished: game.yearPublished,
          thumbnailUrl: game.thumbnailUrl,
          imageUrl: game.imageUrl,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          playingTime: game.playingTime,
          minAge: game.minAge,
          bggRating: game.bggRating,
          bggBayesRating: game.bggBayesRating,
          bggWeight: game.bggWeight,
          designers: game.designers,
          playMode: game.playMode,
          communityPlayers: game.communityPlayers,
          playerCountPoll: game.playerCountPoll as Prisma.InputJsonValue,
          ranks: game.ranks as Prisma.InputJsonValue,
          inBggCollection: nextState.inBggCollection,
          manuallyAdded: nextState.manuallyAdded,
          manuallyRemoved: nextState.manuallyRemoved,
          hidden: presentation.hidden,
          source: presentation.source,
          lastSyncedAt: now
        }
      });

      await replaceCollectionGameTaxonomy(tx, savedGame.id, game, taxonomyMaps);
    }

    const staleBggGames = await tx.collectionGame.findMany({
      where: {
        userProfileId,
        AND: [
          { bggId: { not: null } },
          ...(ownedBggIds.length ? [{ bggId: { notIn: ownedBggIds } }] : [])
        ]
      },
      select: {
        id: true,
        manuallyAdded: true,
        manuallyRemoved: true
      }
    });

    for (const staleGame of staleBggGames) {
      const nextState = {
        inBggCollection: false,
        manuallyAdded: staleGame.manuallyAdded,
        manuallyRemoved: staleGame.manuallyRemoved
      };
      const presentation = deriveCollectionPresentation(nextState);

      await tx.collectionGame.update({
        where: { id: staleGame.id },
        data: {
          inBggCollection: nextState.inBggCollection,
          manuallyAdded: nextState.manuallyAdded,
          manuallyRemoved: nextState.manuallyRemoved,
          hidden: presentation.hidden,
          source: presentation.source,
          lastSyncedAt: now
        }
      });
    }

    await tx.collectionSyncState.upsert({
      where: { userProfileId },
      create: {
        userProfileId,
        bggUsername: username,
        lastSyncedAt: now,
        lastStatus: `${games.length} spellen gesynchroniseerd.`,
        syncInProgress: false,
        syncFinishedAt: now,
        totalGames: games.length,
        processedGames: games.length
      },
      update: {
        bggUsername: username,
        lastSyncedAt: now,
        lastStatus: `${games.length} spellen gesynchroniseerd.`,
        syncInProgress: false,
        syncFinishedAt: now,
        totalGames: games.length,
        processedGames: games.length
      }
    });
  });
}

async function runCollectionSync(userProfileId: string, username: string, xml?: string) {
  const startedAt = new Date();
  await updateSyncState(userProfileId, {
    bggUsername: username,
    lastStatus: 'Collectie synchroniseren met BoardGameGeek...',
    syncInProgress: true,
    syncStartedAt: startedAt,
    syncFinishedAt: null,
    totalGames: 0,
    processedGames: 0
  });

  try {
    const collectionResult = xml
      ? { pending: false, seeds: parseCollectionSeeds(xml) }
      : await fetchCollectionSeedsFromBgg(username);

    if (collectionResult.pending) {
      await updateSyncState(userProfileId, {
        bggUsername: username,
        lastStatus: BGG_COLLECTION_PENDING_MESSAGE,
        syncInProgress: false,
        syncFinishedAt: new Date()
      });
      return;
    }

    const seeds = Array.from(new Map(collectionResult.seeds.map((seed) => [seed.bggId, seed])).values())
      .sort((left, right) => left.title.localeCompare(right.title));

    await updateSyncState(userProfileId, {
      bggUsername: username,
      lastStatus: `${seeds.length} spellen gevonden. Details ophalen...`,
      totalGames: seeds.length,
      processedGames: 0
    });

    const detailedGames: BggThingDetails[] = [];

    for (let index = 0; index < seeds.length; index += BGG_THING_BATCH_SIZE) {
      const batchSeeds = seeds.slice(index, index + BGG_THING_BATCH_SIZE);
      const batchDetails = await fetchThingBatch(batchSeeds.map((seed) => seed.bggId));
      const detailsById = new Map(batchDetails.map((detail) => [detail.bggId, detail]));
      const mergedBatch = batchSeeds.map((seed) => {
        const detail = detailsById.get(seed.bggId);
        return detail
          ? {
            ...toThingFallback(seed),
            ...detail,
            title: detail.title || seed.title,
            yearPublished: detail.yearPublished ?? seed.yearPublished
          }
          : toThingFallback(seed);
      });

      detailedGames.push(...mergedBatch);
      await Promise.all(mergedBatch.map((game) => preloadBggThumbnail(game.bggId, game.thumbnailUrl ?? game.imageUrl)));

      await updateSyncState(userProfileId, {
        bggUsername: username,
        lastStatus: `Details opgehaald voor ${Math.min(index + batchSeeds.length, seeds.length)} van ${seeds.length} spellen.`,
        totalGames: seeds.length,
        processedGames: Math.min(index + batchSeeds.length, seeds.length)
      });

      if (index + BGG_THING_BATCH_SIZE < seeds.length) {
        await delay(BGG_THING_DELAY_MS);
      }
    }

    await persistCollectionGames(userProfileId, username, detailedGames);
  } catch (error) {
    const message = error instanceof Error ? error.message : BGG_TEMPORARY_ERROR_MESSAGE;
    await updateSyncState(userProfileId, {
      bggUsername: username,
      lastStatus: message,
      syncInProgress: false,
      syncFinishedAt: new Date()
    });
    throw error;
  }
}

export async function startCollectionSync(options: { userProfileId: string; username: string; xml?: string }): Promise<StartCollectionSyncResult> {
  if (activeSyncPromises.has(options.userProfileId)) {
    return {
      started: false,
      pending: true,
      message: 'Er loopt al een synchronisatie. Deze pagina ververst automatisch de status.'
    };
  }

  const syncPromise = runCollectionSync(options.userProfileId, options.username, options.xml)
    .catch(() => undefined)
    .finally(() => {
      activeSyncPromises.delete(options.userProfileId);
    });

  activeSyncPromises.set(options.userProfileId, syncPromise);
  void syncPromise;

  return {
    started: true,
    pending: true,
    message: options.xml
      ? 'XML import en verrijking gestart. Dit kan even duren; je mag deze pagina gerust verlaten.'
      : 'Synchronisatie met BoardGameGeek gestart. Dit kan tot 5 minuten duren; je mag deze pagina gerust verlaten.'
  };
}

export async function isCollectionSyncRunning(userProfileId: string) {
  if (activeSyncPromises.has(userProfileId)) return true;

  const syncState = await prisma.collectionSyncState.findUnique({ where: { userProfileId } });
  return Boolean(syncState?.syncInProgress);
}

