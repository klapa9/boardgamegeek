import { NextResponse } from 'next/server';
import { fetchBgg } from '@/lib/bgg-api';
import { parseThingDetails } from '@/lib/bgg-xml';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Ongeldige BGG id.' }, { status: 400 });

  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`;
  const response = await fetchBgg(url, { next: { revalidate: 60 * 60 * 24 * 7 } }, 'thing-single');
  if (!response.ok) return NextResponse.json({ error: 'BoardGameGeek details ophalen is mislukt.' }, { status: 502 });

  const item = parseThingDetails(await response.text()).find((game) => game.bggId === id);
  if (!item) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });

  return NextResponse.json({
    bggId: item.bggId,
    title: item.title,
    yearPublished: item.yearPublished,
    thumbnailUrl: item.thumbnailUrl,
    imageUrl: item.imageUrl,
    minPlayers: item.minPlayers,
    maxPlayers: item.maxPlayers,
    playingTime: item.playingTime,
    minAge: item.minAge,
    averageRating: item.bggRating,
    bayesAverage: item.bggBayesRating,
    averageWeight: item.bggWeight,
    mechanics: item.mechanics,
    categories: item.categories,
    designers: item.designers,
    playMode: item.playMode,
    communityPlayers: item.communityPlayers,
    playerCountPoll: item.playerCountPoll,
    ranks: item.ranks
  });
}

