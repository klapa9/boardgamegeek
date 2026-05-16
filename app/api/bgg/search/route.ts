import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';
import { fetchBgg } from '@/lib/bgg-api';
import { parseThingTypes } from '@/lib/bgg-xml';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

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
    .slice(0, 100);

  const candidateIds = candidates.map((item) => item.bggId);
  let allowedIds = new Set(
    candidates
      .filter((item) => item.itemType !== 'boardgameexpansion')
      .map((item) => item.bggId)
  );

  if (candidateIds.length) {
    const thingUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${candidateIds.join(',')}`;
    const thingResponse = await fetchBgg(thingUrl, { next: { revalidate: 60 * 60 * 24 } }, 'search-thing-filter');

    if (thingResponse.ok) {
      const thingTypes = parseThingTypes(await thingResponse.text());
      allowedIds = new Set(
        thingTypes
          .filter((item) => item.itemType === 'boardgame')
          .map((item) => item.bggId)
      );
    }
  }

  const results = candidates
    .filter((item) => allowedIds.has(item.bggId))
    .map(({ itemType: _itemType, ...result }) => result);

  return NextResponse.json({ results });
}
