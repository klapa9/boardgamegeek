import { XMLParser } from 'fast-xml-parser';
import { NextResponse } from 'next/server';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

function primaryName(names: any): string {
  const list = Array.isArray(names) ? names : names ? [names] : [];
  return list.find((name: any) => name.type === 'primary')?.value ?? list[0]?.value ?? 'Onbekend spel';
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function mechanicsFromLinks(links: any): string[] {
  return asArray<any>(links)
    .filter((link) => link.type === 'boardgamemechanic' && typeof link.value === 'string')
    .map((link) => link.value)
    .sort((a, b) => a.localeCompare(b));
}

function playModeFromMechanics(mechanics: string[]): string {
  return mechanics.some((mechanic) => mechanic.toLowerCase().includes('cooperative')) ? 'cooperative' : 'competitive';
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function communityPlayersFromPolls(polls: any): number[] {
  const poll = asArray<any>(polls).find((item) => item.name === 'suggested_numplayers');
  const recommended = new Set<number>();

  for (const resultGroup of asArray<any>(poll?.results)) {
    const label = String(resultGroup.numplayers ?? '');
    const count = Number(label.replace('+', ''));
    if (!Number.isInteger(count)) continue;

    const votes = asArray<any>(resultGroup.result).reduce<Record<string, number>>((acc, result) => {
      acc[String(result.value)] = num(result.numvotes);
      return acc;
    }, {});

    const positiveVotes = (votes.Best ?? 0) + (votes.Recommended ?? 0);
    const notRecommendedVotes = votes['Not Recommended'] ?? 0;
    if (positiveVotes <= 0 || positiveVotes < notRecommendedVotes) continue;

    recommended.add(count);
    if (label.endsWith('+')) {
      recommended.add(count + 1);
      recommended.add(count + 2);
    }
  }

  return Array.from(recommended).sort((a, b) => a - b);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Ongeldige BGG id.' }, { status: 400 });

  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!response.ok) return NextResponse.json({ error: 'BoardGameGeek details ophalen is mislukt.' }, { status: 502 });

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const rawItem = parsed.items?.item;
  const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;
  if (!item) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });

  const ratings = item.statistics?.ratings;
  const mechanics = mechanicsFromLinks(item.link);
  return NextResponse.json({
    bggId: id,
    title: primaryName(item.name),
    yearPublished: item.yearpublished?.value ? Number(item.yearpublished.value) : null,
    imageUrl: item.thumbnail ?? item.image ?? null,
    minPlayers: item.minplayers?.value ? Number(item.minplayers.value) : null,
    maxPlayers: item.maxplayers?.value ? Number(item.maxplayers.value) : null,
    playingTime: item.playingtime?.value ? Number(item.playingtime.value) : null,
    averageRating: ratings?.average?.value ? Number(ratings.average.value) : null,
    averageWeight: ratings?.averageweight?.value ? Number(ratings.averageweight.value) : null,
    mechanics,
    playMode: playModeFromMechanics(mechanics),
    communityPlayers: communityPlayersFromPolls(item.poll)
  });
}
