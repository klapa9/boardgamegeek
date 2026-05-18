import { fetchBgg } from '@/lib/bgg-api';
import { isBggExpansion } from '@/lib/bgg-filters';
import { BggThingDetails, parseThingDetails } from '@/lib/bgg-xml';

export async function fetchBggGameDetails(bggIds: number[], cacheTag = 'thing-details') {
  const uniqueIds = Array.from(new Set(bggIds.filter((id) => Number.isFinite(id))));
  if (!uniqueIds.length) return [];

  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${uniqueIds.join(',')}&stats=1`;
  const response = await fetchBgg(url, { cache: 'no-store' }, cacheTag);
  if (!response.ok) {
    throw new Error('BoardGameGeek details ophalen is mislukt.');
  }

  return parseThingDetails(await response.text()).filter((game) => !isBggExpansion(game));
}

export async function fetchSingleBggGameDetail(bggId: number, cacheTag = 'thing-single') {
  const [game] = await fetchBggGameDetails([bggId], cacheTag);
  return game ?? null;
}

export function normalizeBggGameIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
  ));
}

export function sessionGameKey(game: Pick<BggThingDetails, 'bggId' | 'title'> | { bggId: number | null; title: string }) {
  return game.bggId !== null && Number.isFinite(game.bggId)
    ? `bgg:${game.bggId}`
    : `title:${game.title.trim().toLowerCase()}`;
}
