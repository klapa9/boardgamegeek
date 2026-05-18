import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeRating } from '@/lib/serializers';
import { syncStoredWebsiteRating } from '@/lib/website-rating';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const gameId = String(body.game_id ?? '').trim();
  const score = Number(body.score);

  if (!playerId || !gameId || !Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: 'Score moet een geheel getal van 0 tot 10 zijn.' }, { status: 400 });
  }

  const [player, game] = await Promise.all([
    prisma.player.findFirst({
      where: {
        id: playerId,
        sessionId: params.id
      },
      select: {
        id: true
      }
    }),
    prisma.game.findFirst({
      where: {
        id: gameId,
        sessionId: params.id
      },
      select: {
        id: true,
        bggId: true,
        title: true
      }
    })
  ]);

  if (!player) {
    return NextResponse.json({ error: 'Speler niet gevonden voor deze sessie.' }, { status: 404 });
  }

  if (!game) {
    return NextResponse.json({ error: 'Spel niet gevonden voor deze sessie.' }, { status: 404 });
  }

  const rating = await prisma.$transaction(async (tx) => {
    const savedRating = await tx.rating.upsert({
      where: { playerId_gameId: { playerId, gameId } },
      update: { score },
      create: { sessionId: params.id, playerId, gameId, score }
    });

    await syncStoredWebsiteRating(tx, {
      bggId: game.bggId,
      title: game.title
    });

    return savedRating;
  });

  return NextResponse.json({ rating: serializeRating(rating) });
}
