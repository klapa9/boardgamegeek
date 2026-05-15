import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';
import { fetchBgg } from '@/lib/bgg-api';

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

  const results = items.slice(0, 100).map((item: any) => ({
    bggId: Number(item.id),
    title: item.name?.value ?? 'Onbekend spel',
    yearPublished: item.yearpublished?.value ? Number(item.yearpublished.value) : null
  }));

  return NextResponse.json({ results });
}
