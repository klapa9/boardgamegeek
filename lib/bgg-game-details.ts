import { fetchBgg } from '@/lib/bgg-api';
import { isBggExpansion, isRpgCoreRule } from '@/lib/bgg-filters';
import { BggThingDetails, parseThingDetails } from '@/lib/bgg-xml';
import { geekApiBaseUrl, GeekType } from '@/lib/geek-types';

export async function fetchBggGameDetails(bggIds: number[], cacheTag = 'thing-details', geekType: GeekType = 'boardgame') {
  const uniqueIds = Array.from(new Set(bggIds.filter((id) => Number.isFinite(id))));
  if (!uniqueIds.length) return [];

  const url = `${geekApiBaseUrl(geekType)}/thing?id=${uniqueIds.join(',')}&stats=1&type=${geekType}`;
  const response = await fetchBgg(url, { cache: 'no-store' }, cacheTag);
  if (!response.ok) {
    throw new Error(geekType === 'rpgitem'
      ? 'RPGGeek details ophalen is mislukt.'
      : 'BoardGameGeek details ophalen is mislukt.');
  }

  return parseThingDetails(await response.text()).filter((game) => (
    geekType === 'rpgitem'
      ? isRpgCoreRule(game)
      : !isBggExpansion(game)
  ));
}

export async function fetchSingleBggGameDetail(bggId: number, cacheTag = 'thing-single', geekType: GeekType = 'boardgame') {
  const [game] = await fetchBggGameDetails([bggId], cacheTag, geekType);
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
