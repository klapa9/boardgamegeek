import { fetchBgg } from '@/lib/bgg-api';
import { isBggExpansion, isRpgGame } from '@/lib/bgg-filters';
import { BggThingDetails, parseThingDetails } from '@/lib/bgg-xml';
import { geekApiBaseUrl, geekApiItemType, GeekType, normalizeGeekType } from '@/lib/geek-types';

export type BggGameRequest = {
  bggId: number;
  geekType: GeekType;
};

function bggGameRequestKey(request: BggGameRequest) {
  return `${request.geekType}:${request.bggId}`;
}

export async function fetchBggGameDetails(bggIds: number[], cacheTag = 'thing-details', geekType: GeekType = 'boardgame') {
  const uniqueIds = Array.from(new Set(bggIds.filter((id) => Number.isFinite(id))));
  if (!uniqueIds.length) return [];

  const geekApiType = geekApiItemType(geekType);
  const url = `${geekApiBaseUrl(geekType)}/thing?id=${uniqueIds.join(',')}&stats=1&type=${geekApiType}`;
  const response = await fetchBgg(url, { cache: 'no-store' }, cacheTag);
  if (!response.ok) {
    throw new Error(geekType === 'rpg'
      ? 'RPGGeek details ophalen is mislukt.'
      : 'BoardGameGeek details ophalen is mislukt.');
  }

  return parseThingDetails(await response.text()).filter((game) => (
    geekType === 'rpg'
      ? isRpgGame(game)
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

export function normalizeBggGameRequests(value: unknown, fallbackIdsValue?: unknown): BggGameRequest[] {
  const requests = Array.isArray(value)
    ? value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const row = entry as Record<string, unknown>;
        const bggId = Number(row.bgg_id ?? row.bggId);
        if (!Number.isFinite(bggId)) return null;

        return {
          bggId,
          geekType: normalizeGeekType(row.geek_type ?? row.geekType)
        } satisfies BggGameRequest;
      })
      .filter((entry): entry is BggGameRequest => Boolean(entry))
    : [];

  const fallbackRequests = normalizeBggGameIds(fallbackIdsValue).map((bggId) => ({
    bggId,
    geekType: 'boardgame' as const
  }));

  return Array.from(new Map(
    [...requests, ...fallbackRequests].map((entry) => [bggGameRequestKey(entry), entry] as const)
  ).values());
}

export async function fetchBggGamesForRequests(requests: BggGameRequest[], cacheTag = 'thing-details') {
  const uniqueRequests = Array.from(new Map(requests.map((request) => [bggGameRequestKey(request), request] as const)).values());
  if (!uniqueRequests.length) return [];

  const groupedIds = uniqueRequests.reduce<Record<GeekType, number[]>>((accumulator, request) => {
    accumulator[request.geekType].push(request.bggId);
    return accumulator;
  }, { boardgame: [], rpg: [] });

  const [boardgames, rpgs] = await Promise.all([
    groupedIds.boardgame.length ? fetchBggGameDetails(groupedIds.boardgame, `${cacheTag}-boardgame`, 'boardgame') : Promise.resolve([]),
    groupedIds.rpg.length ? fetchBggGameDetails(groupedIds.rpg, `${cacheTag}-rpg`, 'rpg') : Promise.resolve([])
  ]);

  const detailsByRequest = new Map<string, BggThingDetails>();
  boardgames.forEach((game) => detailsByRequest.set(bggGameRequestKey({ bggId: game.bggId, geekType: 'boardgame' }), game));
  rpgs.forEach((game) => detailsByRequest.set(bggGameRequestKey({ bggId: game.bggId, geekType: 'rpg' }), game));

  return uniqueRequests
    .map((request) => detailsByRequest.get(bggGameRequestKey(request)) ?? null)
    .filter((game): game is BggThingDetails => Boolean(game));
}

export function sessionGameKey(game: Pick<BggThingDetails, 'bggId' | 'title'> | { bggId: number | null; title: string }) {
  return game.bggId !== null && Number.isFinite(game.bggId)
    ? `bgg:${game.bggId}`
    : `title:${game.title.trim().toLowerCase()}`;
}
