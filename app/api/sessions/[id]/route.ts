import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeAvailability, serializeGame, serializePlayer, serializeRating, serializeSession } from '@/lib/serializers';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  const [players, games, availability, ratings] = await Promise.all([
    prisma.player.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } }),
    prisma.game.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } }),
    prisma.availability.findMany({ where: { sessionId: params.id } }),
    prisma.rating.findMany({ where: { sessionId: params.id } })
  ]);

  return NextResponse.json({
    session: serializeSession(session),
    players: players.map(serializePlayer),
    games: games.map(serializeGame),
    availability: availability.map(serializeAvailability),
    ratings: ratings.map(serializeRating)
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const adminToken = String(body.admin_token ?? '').trim();
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
  if (adminToken !== session.adminToken) return NextResponse.json({ error: 'Alleen de organisator mag dit aanpassen.' }, { status: 403 });

  const chosenDay = body.chosen_day === null ? null : String(body.chosen_day ?? '').trim();
  const locked = typeof body.locked === 'boolean' ? body.locked : session.locked;

  const updated = await prisma.session.update({ where: { id: params.id }, data: { chosenDay, locked } });
  return NextResponse.json({ session: serializeSession(updated) });
}
