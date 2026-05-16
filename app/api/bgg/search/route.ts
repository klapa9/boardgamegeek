import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';
import { fetchBgg } from '@/lib/bgg-api';
import { parseThingTypes } from '@/lib/bgg-xml';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(query)}`;
  const response = await fetchBgg(url, { next: { revalidate: 60 * 60 * 24 } }, 'search');
  if (!response.ok) return NextResponse.json({ error: 'BoardGameGeek zoeken is mislukt.' }, { status: 502 });

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const candidates = items
    .map((item: any) => ({
      bggId: Number(item.id),
      itemType: typeof item.type === 'string' ? item.type : null,
      title: item.name?.value ?? 'Onbekend spel',
      yearPublished: item.yearpublished?.value ? Number(item.yearpublished.value) : null
    }))
    .filter((item) => Number.isFinite(item.bggId) && item.title !== 'Onbekend spel')
    .filter((item) => !looksLikeFanExpansion(item.title))
    .slice(0, MAX_SEARCH_CANDIDATES);

  let allowedIds = new Set(
    candidates
      .filter((item) => item.itemType !== 'boardgameexpansion')
      .map((item) => item.bggId)
  );

  for (const batch of chunk(candidates.map((item) => item.bggId), BGG_THING_BATCH_SIZE)) {
    if (!batch.length) continue;

    const thingUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${batch.join(',')}`;
    const thingResponse = await fetchBgg(thingUrl, { next: { revalidate: 60 * 60 * 24 } }, 'search-thing-filter');
    if (!thingResponse.ok) continue;

    const thingTypes = parseThingTypes(await thingResponse.text());
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
    .map(({ itemType: _itemType, ...result }) => result);

  return NextResponse.json({ results });
}
