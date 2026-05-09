import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

const bggApiToken = process.env.BGG_API_TOKEN;

const headers = {
  'User-Agent': 'Gezelschapsspelkiezer/1.0 local-dev',
  Accept: 'application/xml,text/xml,*/*',
  'Accept-Language': 'nl-BE,nl;q=0.9,en;q=0.8',
  ...(bggApiToken ? { Authorization: `Bearer ${bggApiToken}` } : {})
};

const BGG_COLLECTION_PENDING_MESSAGE = 'BGG is je collectie aan het voorbereiden. Probeer over 30 seconden opnieuw.';
const BGG_AUTH_ERROR_MESSAGE = 'BoardGameGeek weigert de aanvraag. Zet een geldige BGG_API_TOKEN in je .env en herstart de dev server.';
const BGG_TEMPORARY_ERROR_MESSAGE = 'BoardGameGeek is tijdelijk niet bereikbaar. Probeer over een minuut opnieuw.';
const BGG_REQUEST_TIMEOUT_MS = 30000;
const BGG_RETRY_DELAYS_MS = [5000, 5000];

type ParsedCollectionItem = {
  bggId: number;
  title: string;
  yearPublished: number | null;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  bggRating: number | null;
  bggWeight: number | null;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && '#text' in value) return String(value['#text']).trim() || null;
  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCollection(xml: string): ParsedCollectionItem[] {
  const parsed = parser.parse(xml);
  const items = asArray<any>(parsed.items?.item);

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

async function fetchCollection(username: string) {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&subtype=boardgame&stats=1`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= BGG_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(BGG_REQUEST_TIMEOUT_MS) });
      const body = await response.text();

      // BGG returns 202 while it prepares/cache-builds a collection.
      if (response.status === 202) {
        return { pending: true, games: [] as ParsedCollectionItem[] };
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(BGG_AUTH_ERROR_MESSAGE);
      }

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(BGG_TEMPORARY_ERROR_MESSAGE);
        if (attempt < BGG_RETRY_DELAYS_MS.length) {
          await delay(BGG_RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        throw new Error(`BGG gaf HTTP ${response.status}: ${body.slice(0, 160)}`);
      }

      return { pending: false, games: parseCollection(body) };
    } catch (error) {
      lastError = error;
      if (attempt < BGG_RETRY_DELAYS_MS.length) {
        await delay(BGG_RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(BGG_TEMPORARY_ERROR_MESSAGE);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? '').trim();
  if (!username) return NextResponse.json({ error: 'BGG username is verplicht.' }, { status: 400 });

  try {
    const result = await fetchCollection(username);

    if (result.pending) {
      await prisma.collectionSyncState.upsert({
        where: { id: 'default' },
        create: { id: 'default', bggUsername: username, lastStatus: BGG_COLLECTION_PENDING_MESSAGE },
        update: { bggUsername: username, lastStatus: BGG_COLLECTION_PENDING_MESSAGE }
      });
      return NextResponse.json({ imported: 0, pending: true, message: BGG_COLLECTION_PENDING_MESSAGE });
    }

    for (const game of result.games) {
      await prisma.collectionGame.upsert({
        where: { bggId: game.bggId },
        create: {
          bggId: game.bggId,
          title: game.title,
          yearPublished: game.yearPublished,
          imageUrl: game.imageUrl,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          playingTime: game.playingTime,
          bggRating: game.bggRating,
          bggWeight: game.bggWeight,
          hidden: false,
          source: 'bgg'
        },
        update: {
          title: game.title,
          yearPublished: game.yearPublished,
          imageUrl: game.imageUrl,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          playingTime: game.playingTime,
          bggRating: game.bggRating,
          bggWeight: game.bggWeight,
          hidden: false,
          source: 'bgg'
        }
      });
    }

    await prisma.collectionSyncState.upsert({
      where: { id: 'default' },
      create: { id: 'default', bggUsername: username, lastSyncedAt: new Date(), lastStatus: `${result.games.length} spellen gesynchroniseerd.` },
      update: { bggUsername: username, lastSyncedAt: new Date(), lastStatus: `${result.games.length} spellen gesynchroniseerd.` }
    });

    return NextResponse.json({ imported: result.games.length, pending: false, message: `${result.games.length} spellen gesynchroniseerd.` });
  } catch (error) {
    const message = error instanceof Error && (error.name === 'TimeoutError' || error.message.includes('fetch failed'))
      ? BGG_TEMPORARY_ERROR_MESSAGE
      : error instanceof Error ? error.message : 'BGG synchronisatie mislukt.';

    await prisma.collectionSyncState.upsert({
      where: { id: 'default' },
      create: { id: 'default', bggUsername: username, lastStatus: message },
      update: { bggUsername: username, lastStatus: message }
    });
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
