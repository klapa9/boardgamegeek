import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeAvailability, serializeGame, serializePlayer, serializeRating, serializeSession } from '@/lib/serializers';

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { dateOptions: { orderBy: { date: 'asc' } } }
  });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  const [players, games, availability, ratings] = await Promise.all([
    prisma.player.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } }),
    prisma.game.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } }),
    prisma.availability.findMany({ where: { sessionId: params.id } }),
    prisma.rating.findMany({ where: { sessionId: params.id } })
  ]);

  return NextResponse.json({
    session: serializeSession(session, session.dateOptions),
    players: players.map(serializePlayer),
    games: games.map(serializeGame),
    availability: availability.map(serializeAvailability),
    ratings: ratings.map(serializeRating)
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const adminToken = String(body.admin_token ?? '').trim();
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { dateOptions: true }
  });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
  if (adminToken !== session.adminToken) return NextResponse.json({ error: 'Alleen de organisator mag dit aanpassen.' }, { status: 403 });

  const chosenDay = body.chosen_day === null ? null : normalizeDate(body.chosen_day);
  const locked = typeof body.locked === 'boolean' ? body.locked : session.locked;
  if (body.chosen_day !== null && body.chosen_day !== undefined && !chosenDay) {
    return NextResponse.json({ error: 'Kies een geldige datum.' }, { status: 400 });
  }
  if (chosenDay && !session.dateOptions.some((option: { date: string }) => option.date === chosenDay)) {
    return NextResponse.json({ error: 'Deze datum staat niet tussen de voorstellen.' }, { status: 400 });
  }

  const updated = await prisma.session.update({
    where: { id: params.id },
    data: { chosenDay, locked },
    include: { dateOptions: { orderBy: { date: 'asc' } } }
  });
  return NextResponse.json({ session: serializeSession(updated, updated.dateOptions) });
}
