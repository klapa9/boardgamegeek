import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';
import { fetchBgg } from '@/lib/bgg-api';
import { isRpgGame } from '@/lib/bgg-filters';
import { BggThingSummary, parseThingTypes } from '@/lib/bgg-xml';
import { geekApiBaseUrl, geekApiItemType, geekTypeLabel, normalizeGeekType } from '@/lib/geek-types';
import { cachedImageUrl } from '@/lib/image-cache';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
const BGG_THING_BATCH_SIZE = 20;
const MAX_SEARCH_CANDIDATES = 120;

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function looksLikeFanExpansion(title: string) {
  const normalized = title.toLowerCase();
  return normalized.includes('fan expansion') || normalized.includes('fan expedition');
}

function matchPriority(title: string, query: string) {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedTitle === normalizedQuery) return 0;
  if (normalizedTitle.startsWith(normalizedQuery)) return 1;
  if (normalizedTitle.includes(normalizedQuery)) return 2;
  return 3;
}

function mediaResult(item: { bggId: number }, mediaById: Map<number, BggThingSummary>) {
  const media = mediaById.get(item.bggId);

  return {
    thumbnailUrl: cachedImageUrl(media?.thumbnailUrl ?? media?.imageUrl, 'thumb', item.bggId),
    imageUrl: cachedImageUrl(media?.imageUrl ?? media?.thumbnailUrl, 'full', item.bggId)
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const geekType = normalizeGeekType(searchParams.get('catalog'));
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  const geekLabel = geekTypeLabel(geekType);
  const geekApiType = geekApiItemType(geekType);
  const url = `${geekApiBaseUrl(geekType)}/search?type=${geekApiType}&query=${encodeURIComponent(query)}`;
  const response = await fetchBgg(url, { next: { revalidate: 60 * 60 * 24 } }, 'search');
  if (!response.ok) return NextResponse.json({ error: `${geekLabel} zoeken is mislukt.` }, { status: 502 });

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const candidates = items
    .map((item: any) => ({
      bggId: Number(item.id),
      geekType,
      itemType: typeof item.type === 'string' ? item.type : null,
      title: item.name?.value ?? 'Onbekend spel',
      yearPublished: item.yearpublished?.value ? Number(item.yearpublished.value) : null
    }))
    .filter((item) => Number.isFinite(item.bggId) && item.title !== 'Onbekend spel')
    .filter((item) => !looksLikeFanExpansion(item.title))
    .slice(0, MAX_SEARCH_CANDIDATES);

  if (geekType === 'rpg') {
    const allowedIds = new Set<number>();
    const mediaById = new Map<number, BggThingSummary>();

    for (const batch of chunk(candidates.map((item) => item.bggId), BGG_THING_BATCH_SIZE)) {
      if (!batch.length) continue;

      const thingUrl = `${geekApiBaseUrl(geekType)}/thing?id=${batch.join(',')}&stats=1&type=${geekApiType}`;
      const thingResponse = await fetchBgg(thingUrl, { next: { revalidate: 60 * 60 * 24 } }, 'search-rpg-filter');
      if (!thingResponse.ok) continue;

      const thingSummaries = parseThingTypes(await thingResponse.text());
      thingSummaries.forEach((item) => mediaById.set(item.bggId, item));
      thingSummaries.filter(isRpgGame).forEach((item) => allowedIds.add(item.bggId));
    }

    const results = candidates
      .filter((item) => allowedIds.has(item.bggId))
      .sort((left, right) => (
        matchPriority(left.title, query) - matchPriority(right.title, query)
        || left.title.length - right.title.length
        || left.title.localeCompare(right.title)
        || (left.yearPublished ?? Number.MAX_SAFE_INTEGER) - (right.yearPublished ?? Number.MAX_SAFE_INTEGER)
      ))
      .map(({ itemType: _itemType, ...result }) => ({
        ...result,
        ...mediaResult(result, mediaById)
      }));

    return NextResponse.json({ results });
  }

  let allowedIds = new Set(
    candidates
      .filter((item) => item.itemType !== 'boardgameexpansion')
      .map((item) => item.bggId)
  );
  const mediaById = new Map<number, BggThingSummary>();

  for (const batch of chunk(candidates.map((item) => item.bggId), BGG_THING_BATCH_SIZE)) {
    if (!batch.length) continue;

    const thingUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${batch.join(',')}`;
    const thingResponse = await fetchBgg(thingUrl, { next: { revalidate: 60 * 60 * 24 } }, 'search-thing-filter');
    if (!thingResponse.ok) continue;

    const thingTypes = parseThingTypes(await thingResponse.text());
    thingTypes.forEach((item) => mediaById.set(item.bggId, item));
    const batchAllowedIds = new Set(
      thingTypes
        .filter((item) => item.itemType === 'boardgame')
        .map((item) => item.bggId)
    );

    allowedIds = new Set([...allowedIds].filter((id) => !batch.includes(id) || batchAllowedIds.has(id)));
  }

  const results = candidates
    .filter((item) => allowedIds.has(item.bggId))
    .sort((left, right) => (
      matchPriority(left.title, query) - matchPriority(right.title, query)
      || left.title.length - right.title.length
      || left.title.localeCompare(right.title)
      || (left.yearPublished ?? Number.MAX_SAFE_INTEGER) - (right.yearPublished ?? Number.MAX_SAFE_INTEGER)
    ))
    .map(({ itemType: _itemType, ...result }) => ({
      ...result,
      ...mediaResult(result, mediaById)
    }));

  return NextResponse.json({ results });
}
