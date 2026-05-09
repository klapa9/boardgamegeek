import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';

const DEFAULT_BGG_USERNAME = 'gezelschapspelgroep';
const BGG_REQUEST_TIMEOUT_MS = 30000;
const BGG_RETRY_DELAYS_MS = [5000, 10000, 15000, 30000, 30000, 30000];

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
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value) {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && '#text' in value) return String(value['#text']).trim() || null;
  return null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCollection(xml) {
  const parsed = parser.parse(xml);
  const items = asArray(parsed.items?.item);

  return items.map((item) => ({
    bggId: Number(item.objectid),
    title: text(item.name) ?? 'Onbekend spel',
    yearPublished: num(item.yearpublished),
    imageUrl: item.thumbnail ?? item.image ?? null,
    minPlayers: num(item.stats?.minplayers),
    maxPlayers: num(item.stats?.maxplayers),
    playingTime: num(item.stats?.playingtime),
    bggRating: num(item.stats?.rating?.average?.value),
    bggWeight: num(item.stats?.rating?.averageweight?.value)
  })).filter((item) => Number.isFinite(item.bggId) && item.title !== 'Onbekend spel');
}

async function fetchCollection(username) {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}`;
  let lastError = null;

  for (let attempt = 0; attempt <= BGG_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS) });
      const body = await response.text();

      if (response.status === 202) {
        if (attempt < BGG_RETRY_DELAYS_MS.length) {
          await delay(BGG_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        return { pending: true, games: [] };
      }
      if (response.status === 401 || response.status === 403) throw new Error('BoardGameGeek weigert de publieke collectie-aanvraag.');
      if (response.status === 429 || response.status >= 500) throw new Error(`BoardGameGeek is tijdelijk niet bereikbaar: HTTP ${response.status}.`);
      if (!response.ok) throw new Error(`BoardGameGeek gaf HTTP ${response.status}: ${body.slice(0, 160)}`);

      return { pending: false, games: parseCollection(body) };
    } catch (error) {
      lastError = error;
      if (attempt < BGG_RETRY_DELAYS_MS.length) await delay(BGG_RETRY_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('BGG synchronisatie mislukt.');
}

async function main() {
  const username = process.env.DEFAULT_BGG_USERNAME || DEFAULT_BGG_USERNAME;
  const result = await fetchCollection(username);

  if (result.pending) {
    const message = 'BGG is je collectie aan het voorbereiden. Run de database-sync straks opnieuw.';
    await prisma.collectionSyncState.upsert({
      where: { id: 'default' },
      create: { id: 'default', bggUsername: username, lastStatus: message },
      update: { bggUsername: username, lastStatus: message }
    });
    console.log(message);
    return;
  }

  for (const game of result.games) {
    await prisma.collectionGame.upsert({
      where: { bggId: game.bggId },
      create: { ...game, hidden: false, source: 'bgg' },
      update: { ...game, hidden: false, source: 'bgg' }
    });
  }

  const message = `${result.games.length} spellen van ${username} opgeslagen in de database.`;
  await prisma.collectionSyncState.upsert({
    where: { id: 'default' },
    create: { id: 'default', bggUsername: username, lastSyncedAt: new Date(), lastStatus: message },
    update: { bggUsername: username, lastSyncedAt: new Date(), lastStatus: message }
  });
  console.log(message);
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
