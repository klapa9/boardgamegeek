import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { CollectionSeed, BggThingDetails, parseCollectionSeeds, parseThingDetails } from '@/lib/bgg-xml';
import { preloadBggThumbnail } from '@/lib/image-cache';

const BGG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
  Accept: 'application/xml,text/xml,*/*',
  'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8'
};

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

let activeSyncPromise: Promise<void> | null = null;
type SyncStatePatch = Partial<Prisma.CollectionSyncStateCreateInput>;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toThingFallback(seed: CollectionSeed): BggThingDetails {
  return {
    bggId: seed.bggId,
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

async function updateSyncState(data: SyncStatePatch) {
  await prisma.collectionSyncState.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
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
      const response = await fetch(url, {
        headers: BGG_HEADERS,
        cache: 'no-store',
        signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS)
      });
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
      const response = await fetch(url, {
        headers: BGG_HEADERS,
        cache: 'no-store',
        signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS)
      });
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

async function persistCollectionGames(username: string, games: BggThingDetails[]) {
  const now = new Date();
  const allMechanics = Array.from(new Set(games.flatMap((game) => game.mechanics))).sort((left, right) => left.localeCompare(right));
  const allCategories = Array.from(new Set(games.flatMap((game) => game.categories))).sort((left, right) => left.localeCompare(right));
  const ownedBggIds = games.map((game) => game.bggId);

  await prisma.$transaction(async (tx) => {
    if (allMechanics.length) {
      await tx.mechanic.createMany({
        data: allMechanics.map((name) => ({ name })),
        skipDuplicates: true
      });
    }

    if (allCategories.length) {
      await tx.category.createMany({
        data: allCategories.map((name) => ({ name })),
        skipDuplicates: true
      });
    }

    const [mechanics, categories] = await Promise.all([
      allMechanics.length ? tx.mechanic.findMany({ where: { name: { in: allMechanics } } }) : Promise.resolve([]),
      allCategories.length ? tx.category.findMany({ where: { name: { in: allCategories } } }) : Promise.resolve([])
    ]);

    const mechanicIdByName = new Map(mechanics.map((mechanic) => [mechanic.name, mechanic.id]));
    const categoryIdByName = new Map(categories.map((category) => [category.name, category.id]));

    for (const game of games) {
      const savedGame = await tx.collectionGame.upsert({
        where: { bggId: game.bggId },
        create: {
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
          hidden: false,
          source: 'bgg',
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
          hidden: false,
          source: 'bgg',
          lastSyncedAt: now
        }
      });

      await tx.collectionGameMechanic.deleteMany({ where: { collectionGameId: savedGame.id } });
      if (game.mechanics.length) {
        await tx.collectionGameMechanic.createMany({
          data: game.mechanics
            .map((name) => mechanicIdByName.get(name))
            .filter((id): id is string => Boolean(id))
            .map((mechanicId) => ({ collectionGameId: savedGame.id, mechanicId })),
          skipDuplicates: true
        });
      }

      await tx.collectionGameCategory.deleteMany({ where: { collectionGameId: savedGame.id } });
      if (game.categories.length) {
        await tx.collectionGameCategory.createMany({
          data: game.categories
            .map((name) => categoryIdByName.get(name))
            .filter((id): id is string => Boolean(id))
            .map((categoryId) => ({ collectionGameId: savedGame.id, categoryId })),
          skipDuplicates: true
        });
      }
    }

    await tx.collectionGame.updateMany({
      where: {
        source: 'bgg',
        ...(ownedBggIds.length ? { bggId: { notIn: ownedBggIds } } : {})
      },
      data: {
        hidden: true,
        lastSyncedAt: now
      }
    });

    await tx.collectionSyncState.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
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

async function runCollectionSync(username: string, xml?: string) {
  const startedAt = new Date();
  await updateSyncState({
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
      await updateSyncState({
        bggUsername: username,
        lastStatus: BGG_COLLECTION_PENDING_MESSAGE,
        syncInProgress: false,
        syncFinishedAt: new Date()
      });
      return;
    }

    const seeds = Array.from(new Map(collectionResult.seeds.map((seed) => [seed.bggId, seed])).values())
      .sort((left, right) => left.title.localeCompare(right.title));

    await updateSyncState({
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

      await updateSyncState({
        bggUsername: username,
        lastStatus: `Details opgehaald voor ${Math.min(index + batchSeeds.length, seeds.length)} van ${seeds.length} spellen.`,
        totalGames: seeds.length,
        processedGames: Math.min(index + batchSeeds.length, seeds.length)
      });

      if (index + BGG_THING_BATCH_SIZE < seeds.length) {
        await delay(BGG_THING_DELAY_MS);
      }
    }

    await persistCollectionGames(username, detailedGames);
  } catch (error) {
    const message = error instanceof Error ? error.message : BGG_TEMPORARY_ERROR_MESSAGE;
    await updateSyncState({
      bggUsername: username,
      lastStatus: message,
      syncInProgress: false,
      syncFinishedAt: new Date()
    });
    throw error;
  }
}

export async function startCollectionSync(options: { username: string; xml?: string }): Promise<StartCollectionSyncResult> {
  if (activeSyncPromise) {
    return {
      started: false,
      pending: true,
      message: 'Er loopt al een synchronisatie. Deze pagina ververst automatisch de status.'
    };
  }

  activeSyncPromise = runCollectionSync(options.username, options.xml)
    .catch(() => undefined)
    .finally(() => {
      activeSyncPromise = null;
    });

  void activeSyncPromise;

  return {
    started: true,
    pending: true,
    message: options.xml
      ? 'XML import en verrijking gestart op de achtergrond.'
      : 'Synchronisatie met BoardGameGeek gestart op de achtergrond.'
  };
}

export async function isCollectionSyncRunning() {
  if (activeSyncPromise) return true;

  const syncState = await prisma.collectionSyncState.findUnique({ where: { id: 'default' } });
  return Boolean(syncState?.syncInProgress);
}

