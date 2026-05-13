import { XMLParser } from 'fast-xml-parser';

export type BggRank = {
  id: number | null;
  name: string;
  friendlyName: string;
  value: number | null;
  bayesAverage: number | null;
};

export type CommunityPlayerPollEntry = {
  label: string;
  playerCount: number;
  bestVotes: number;
  recommendedVotes: number;
  notRecommendedVotes: number;
  totalVotes: number;
  recommended: boolean;
};

export type CollectionSeed = {
  bggId: number;
  title: string;
  yearPublished: number | null;
};

export type BggThingDetails = {
  bggId: number;
  title: string;
  yearPublished: number | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  minAge: number | null;
  bggRating: number | null;
  bggBayesRating: number | null;
  bggWeight: number | null;
  mechanics: string[];
  categories: string[];
  designers: string[];
  playMode: string | null;
  communityPlayers: number[];
  playerCountPoll: CommunityPlayerPollEntry[];
  ranks: BggRank[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as Record<string, unknown>)['#text']).trim() || null;
  }
  return null;
}

function primaryName(names: unknown): string {
  const list = asArray<Record<string, unknown>>(names as Record<string, unknown>[] | Record<string, unknown> | undefined);
  return list.find((name) => name.type === 'primary')?.value as string ?? list[0]?.value as string ?? 'Onbekend spel';
}

function normalizeNameList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function extractLinkValues(links: unknown, type: string) {
  return normalizeNameList(
    asArray<Record<string, unknown>>(links as Record<string, unknown>[] | Record<string, unknown> | undefined)
      .filter((link) => link.type === type && typeof link.value === 'string')
      .map((link) => String(link.value))
  );
}

function playModeFromMechanics(mechanics: string[]): string | null {
  if (!mechanics.length) return null;
  return mechanics.some((mechanic) => mechanic.toLowerCase().includes('cooperative')) ? 'cooperative' : 'competitive';
}

function communityPlayerPollFromPolls(polls: unknown): CommunityPlayerPollEntry[] {
  const poll = asArray<Record<string, unknown>>(polls as Record<string, unknown>[] | Record<string, unknown> | undefined)
    .find((item) => item.name === 'suggested_numplayers');

  return asArray<Record<string, unknown>>(poll?.results as Record<string, unknown>[] | Record<string, unknown> | undefined)
    .map((resultGroup) => {
      const label = String(resultGroup.numplayers ?? '').trim();
      const playerCount = Number(label.replace('+', ''));
      if (!label || !Number.isInteger(playerCount)) return null;

      const votes = asArray<Record<string, unknown>>(resultGroup.result as Record<string, unknown>[] | Record<string, unknown> | undefined)
        .reduce<Record<string, number>>((accumulator, result) => {
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
      } satisfies CommunityPlayerPollEntry;
    })
    .filter((entry): entry is CommunityPlayerPollEntry => Boolean(entry))
    .sort((left, right) => left.playerCount - right.playerCount || left.label.localeCompare(right.label));
}

function recommendedPlayersFromPoll(entries: CommunityPlayerPollEntry[]): number[] {
  const recommended = new Set<number>();

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

function ranksFromStatistics(ranks: unknown): BggRank[] {
  return asArray<Record<string, unknown>>(ranks as Record<string, unknown>[] | Record<string, unknown> | undefined)
    .map((rank) => ({
      id: num(rank.id),
      name: String(rank.name ?? '').trim(),
      friendlyName: String(rank.friendlyname ?? '').trim(),
      value: String(rank.value ?? '').toLowerCase() === 'not ranked' ? null : num(rank.value),
      bayesAverage: num(rank.bayesaverage)
    }))
    .filter((rank) => Boolean(rank.name || rank.friendlyName));
}

export function parseCollectionSeeds(xml: string): CollectionSeed[] {
  const parsed = parser.parse(xml);
  const items = asArray<Record<string, unknown>>(parsed.items?.item as Record<string, unknown>[] | Record<string, unknown> | undefined);

  return items
    .filter((item) => {
      const status = item.status as Record<string, unknown> | undefined;
      if (!status || typeof status.own === 'undefined') return true;
      return String(status.own) === '1';
    })
    .map((item) => ({
      bggId: Number(item.objectid),
      title: text(item.name) ?? 'Onbekend spel',
      yearPublished: num(item.yearpublished)
    }))
    .filter((item) => Number.isFinite(item.bggId) && item.title !== 'Onbekend spel');
}

export function parseThingDetails(xml: string): BggThingDetails[] {
  const parsed = parser.parse(xml);
  const items = asArray<Record<string, unknown>>(parsed.items?.item as Record<string, unknown>[] | Record<string, unknown> | undefined);

  return items
    .map((item) => {
      const bggId = Number(item.id);
      if (!Number.isFinite(bggId)) return null;

      const mechanics = extractLinkValues(item.link, 'boardgamemechanic');
      const categories = extractLinkValues(item.link, 'boardgamecategory');
      const designers = extractLinkValues(item.link, 'boardgamedesigner');
      const ratings = item.statistics && typeof item.statistics === 'object'
        ? (item.statistics as Record<string, unknown>).ratings as Record<string, unknown> | undefined
        : undefined;
      const playerCountPoll = communityPlayerPollFromPolls(item.poll);

      return {
        bggId,
        title: primaryName(item.name),
        yearPublished: num((item.yearpublished as Record<string, unknown> | undefined)?.value),
        thumbnailUrl: text(item.thumbnail),
        imageUrl: text(item.image),
        minPlayers: num((item.minplayers as Record<string, unknown> | undefined)?.value),
        maxPlayers: num((item.maxplayers as Record<string, unknown> | undefined)?.value),
        playingTime: num((item.playingtime as Record<string, unknown> | undefined)?.value),
        minAge: num((item.minage as Record<string, unknown> | undefined)?.value),
        bggRating: num(ratings?.average && typeof ratings.average === 'object' ? (ratings.average as Record<string, unknown>).value : ratings?.average),
        bggBayesRating: num(ratings?.bayesaverage && typeof ratings.bayesaverage === 'object' ? (ratings.bayesaverage as Record<string, unknown>).value : ratings?.bayesaverage),
        bggWeight: num(ratings?.averageweight && typeof ratings.averageweight === 'object' ? (ratings.averageweight as Record<string, unknown>).value : ratings?.averageweight),
        mechanics,
        categories,
        designers,
        playMode: playModeFromMechanics(mechanics),
        communityPlayers: recommendedPlayersFromPoll(playerCountPoll),
        playerCountPoll,
        ranks: ranksFromStatistics(ratings?.ranks && typeof ratings.ranks === 'object' ? (ratings.ranks as Record<string, unknown>).rank : undefined)
      } satisfies BggThingDetails;
    })
    .filter((item): item is BggThingDetails => Boolean(item));
}

