import { NextResponse } from 'next/server';
import { fetchSingleBggGameDetail } from '@/lib/bgg-game-details';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Ongeldige BGG id.' }, { status: 400 });

  const item = await fetchSingleBggGameDetail(id, 'thing-single');
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

