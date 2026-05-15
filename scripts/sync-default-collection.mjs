import fs from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const DEFAULT_BGG_USERNAME = 'boardgamegeek.be';
const BGG_REQUEST_TIMEOUT_MS = 30000;
const BGG_COLLECTION_RETRY_DELAYS_MS = [3000, 5000, 8000, 12000];
const BGG_THING_RETRY_DELAYS_MS = [1500, 3000, 5000];
const BGG_THING_BATCH_SIZE = 20;
const BGG_THING_DELAY_MS = 1250;

loadDotEnv();

const prisma = new PrismaClient();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
  Accept: 'application/xml,text/xml,*/*',
  'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8'
};

function loadDotEnv() {
  const file = path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^"(.*)"$/, '$1');
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value) {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && '#text' in value) return String(value['#text']).trim() || null;
  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function primaryName(names) {
  const list = asArray(names);
  return list.find((name) => name.type === 'primary')?.value ?? list[0]?.value ?? 'Onbekend spel';
}

function normalizeNameList(values) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function extractLinkValues(links, type) {
  return normalizeNameList(
    asArray(links)
      .filter((link) => link.type === type && typeof link.value === 'string')
      .map((link) => String(link.value))
  );
}

function playModeFromMechanics(mechanics) {
  if (!mechanics.length) return null;
  return mechanics.some((mechanic) => mechanic.toLowerCase().includes('cooperative')) ? 'cooperative' : 'competitive';
}

function communityPlayerPollFromPolls(polls) {
  const poll = asArray(polls).find((item) => item.name === 'suggested_numplayers');

  return asArray(poll?.results)
    .map((resultGroup) => {
      const label = String(resultGroup.numplayers ?? '').trim();
      const playerCount = Number(label.replace('+', ''));
      if (!label || !Number.isInteger(playerCount)) return null;

      const votes = asArray(resultGroup.result).reduce((accumulator, result) => {
        accumulator[String(result.value)] = num(result.numvotes) ?? 0;
        return accumulator;
      }, {});

      const bestVotes = votes.Best ?? 0;
      const recommendedVotes = votes.Recommended ?? 0;
      const notRecommendedVotes = votes['Not Recommended'] ?? 0;
      const totalVotes = bestVotes + recommendedVotes + notRecommendedVotes;

      return {
        label,
        playerCount,
        bestVotes,
        recommendedVotes,
        notRecommendedVotes,
        totalVotes,
        recommended: totalVotes > 0 && (bestVotes + recommendedVotes) >= notRecommendedVotes
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.playerCount - right.playerCount || left.label.localeCompare(right.label));
}

function recommendedPlayersFromPoll(entries) {
  const recommended = new Set();

  for (const entry of entries) {
    if (!entry.recommended) continue;
    recommended.add(entry.playerCount);
    if (entry.label.endsWith('+')) {
      recommended.add(entry.playerCount + 1);
      recommended.add(entry.playerCount + 2);
    }
  }

  return Array.from(recommended).sort((left, right) => left - right);
}

function ranksFromStatistics(ranks) {
  return asArray(ranks)
    .map((rank) => ({
      id: num(rank.id),
      name: String(rank.name ?? '').trim(),
      friendlyName: String(rank.friendlyname ?? '').trim(),
      value: String(rank.value ?? '').toLowerCase() === 'not ranked' ? null : num(rank.value),
      bayesAverage: num(rank.bayesaverage)
    }))
    .filter((rank) => rank.name || rank.friendlyName);
}

function parseCollectionSeeds(xml) {
  const parsed = parser.parse(xml);
  const items = asArray(parsed.items?.item);

  return items
    .filter((item) => {
      if (!item.status || typeof item.status.own === 'undefined') return true;
      return String(item.status.own) === '1';
    })
    .map((item) => ({
      bggId: Number(item.objectid),
      title: text(item.name) ?? 'Onbekend spel',
      yearPublished: num(item.yearpublished)
    }))
    .filter((item) => Number.isFinite(item.bggId) && item.title !== 'Onbekend spel');
}

function parseThingDetails(xml) {
  const parsed = parser.parse(xml);
  const items = asArray(parsed.items?.item);

  return items
    .map((item) => {
      const bggId = Number(item.id);
      if (!Number.isFinite(bggId)) return null;

      const mechanics = extractLinkValues(item.link, 'boardgamemechanic');
      const categories = extractLinkValues(item.link, 'boardgamecategory');
      const designers = extractLinkValues(item.link, 'boardgamedesigner');
      const ratings = item.statistics?.ratings;
      const playerCountPoll = communityPlayerPollFromPolls(item.poll);

      return {
        bggId,
        title: primaryName(item.name),
        yearPublished: num(item.yearpublished?.value),
        thumbnailUrl: text(item.thumbnail),
        imageUrl: text(item.image),
        minPlayers: num(item.minplayers?.value),
        maxPlayers: num(item.maxplayers?.value),
        playingTime: num(item.playingtime?.value),
        minAge: num(item.minage?.value),
        bggRating: num(ratings?.average?.value ?? ratings?.average),
        bggBayesRating: num(ratings?.bayesaverage?.value ?? ratings?.bayesaverage),
        bggWeight: num(ratings?.averageweight?.value ?? ratings?.averageweight),
        mechanics,
        categories,
        designers,
        playMode: playModeFromMechanics(mechanics),
        communityPlayers: recommendedPlayersFromPoll(playerCountPoll),
        playerCountPoll,
        ranks: ranksFromStatistics(ratings?.ranks?.rank)
      };
    })
    .filter(Boolean);
}

async function fetchCollectionSeeds(username) {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1`;
  let lastError = null;

  for (let attempt = 0; attempt <= BGG_COLLECTION_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS) });
      const body = await response.text();

      if (response.status === 202) {
        if (attempt < BGG_COLLECTION_RETRY_DELAYS_MS.length) {
          await delay(BGG_COLLECTION_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        return { pending: true, seeds: [] };
      }

      if (response.status === 401 || response.status === 403) throw new Error('BoardGameGeek weigert de publieke collectie-aanvraag.');
      if (response.status === 429 || response.status >= 500) throw new Error('BoardGameGeek is tijdelijk niet bereikbaar.');
      if (!response.ok) throw new Error(`BoardGameGeek gaf HTTP ${response.status}: ${body.slice(0, 160)}`);

      return { pending: false, seeds: parseCollectionSeeds(body) };
    } catch (error) {
      lastError = error;
      if (attempt < BGG_COLLECTION_RETRY_DELAYS_MS.length) await delay(BGG_COLLECTION_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('BGG synchronisatie mislukt.');
}

async function fetchThingBatch(ids) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids.join(',')}&stats=1`;
  let lastError = null;

  for (let attempt = 0; attempt <= BGG_THING_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS) });
      const body = await response.text();

      if (response.status === 429 || response.status >= 500) throw new Error('BoardGameGeek thing endpoint is tijdelijk niet bereikbaar.');
      if (!response.ok) throw new Error(`BoardGameGeek thing gaf HTTP ${response.status}: ${body.slice(0, 160)}`);

      return parseThingDetails(body);
    } catch (error) {
      lastError = error;
      if (attempt < BGG_THING_RETRY_DELAYS_MS.length) await delay(BGG_THING_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Thing details ophalen mislukt.');
}

async function persistCollection(username, games) {
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
      allMechanics.length ? tx.mechanic.findMany({ where: { name: { in: allMechanics } } }) : [],
      allCategories.length ? tx.category.findMany({ where: { name: { in: allCategories } } }) : []
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
          playerCountPoll: game.playerCountPoll,
          ranks: game.ranks,
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
          playerCountPoll: game.playerCountPoll,
          ranks: game.ranks,
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
            .filter(Boolean)
            .map((mechanicId) => ({ collectionGameId: savedGame.id, mechanicId })),
          skipDuplicates: true
        });
      }

      await tx.collectionGameCategory.deleteMany({ where: { collectionGameId: savedGame.id } });
      if (game.categories.length) {
        await tx.collectionGameCategory.createMany({
          data: game.categories
            .map((name) => categoryIdByName.get(name))
            .filter(Boolean)
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
        lastStatus: `${games.length} spellen opgeslagen via CLI sync.`,
        syncInProgress: false,
        syncFinishedAt: now,
        totalGames: games.length,
        processedGames: games.length
      },
      update: {
        bggUsername: username,
        lastSyncedAt: now,
        lastStatus: `${games.length} spellen opgeslagen via CLI sync.`,
        syncInProgress: false,
        syncFinishedAt: now,
        totalGames: games.length,
        processedGames: games.length
      }
    });
  });
}

async function main() {
  const username = process.env.DEFAULT_BGG_USERNAME || DEFAULT_BGG_USERNAME;
  const result = await fetchCollectionSeeds(username);

  if (result.pending) {
    const message = 'BGG is je collectie nog aan het voorbereiden. Run de CLI-sync later opnieuw.';
    await prisma.collectionSyncState.upsert({
      where: { id: 'default' },
      create: { id: 'default', bggUsername: username, lastStatus: message, syncInProgress: false },
      update: { bggUsername: username, lastStatus: message, syncInProgress: false }
    });
    console.log(message);
    return;
  }

  const seeds = Array.from(new Map(result.seeds.map((seed) => [seed.bggId, seed])).values());
  const detailedGames = [];

  for (let index = 0; index < seeds.length; index += BGG_THING_BATCH_SIZE) {
    const batchSeeds = seeds.slice(index, index + BGG_THING_BATCH_SIZE);
    const batchDetails = await fetchThingBatch(batchSeeds.map((seed) => seed.bggId));
    const detailsById = new Map(batchDetails.map((detail) => [detail.bggId, detail]));

    for (const seed of batchSeeds) {
      const detail = detailsById.get(seed.bggId);
      detailedGames.push(detail ?? {
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
      });
    }

    console.log(`Details opgehaald voor ${Math.min(index + batchSeeds.length, seeds.length)} van ${seeds.length} spellen...`);
    if (index + BGG_THING_BATCH_SIZE < seeds.length) await delay(BGG_THING_DELAY_MS);
  }

  await persistCollection(username, detailedGames);
  console.log(`${detailedGames.length} spellen van ${username} opgeslagen in de database.`);
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
