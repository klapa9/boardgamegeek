import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeRating } from '@/lib/serializers';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const gameId = String(body.game_id ?? '').trim();
  const score = Number(body.score);

  if (!playerId || !gameId || !Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json({ error: 'Score moet een geheel getal van 0 tot 10 zijn.' }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { playerId_gameId: { playerId, gameId } },
    update: { score },
    create: { sessionId: params.id, playerId, gameId, score }
  });

  return NextResponse.json({ rating: serializeRating(rating) });
}
