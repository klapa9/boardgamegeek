import { NextResponse } from 'next/server';
import { fetchSingleBggGameDetail } from '@/lib/bgg-game-details';
import { normalizeGeekType } from '@/lib/geek-types';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Ongeldige BGG id.' }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const geekType = normalizeGeekType(searchParams.get('geek_type'));

  const item = await fetchSingleBggGameDetail(id, 'thing-single', geekType);
  if (!item) return NextResponse.json({ error: 'Spel niet gevonden.' }, { status: 404 });

  return NextResponse.json({
    bggId: item.bggId,
    geekType: geekType === 'rpg' ? 'rpg' : 'boardgame',
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

