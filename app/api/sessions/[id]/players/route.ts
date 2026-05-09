import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializePlayer } from '@/lib/serializers';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 });

  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  const player = await prisma.player.create({ data: { sessionId: params.id, name } });
  return NextResponse.json({ player: serializePlayer(player) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!playerId || !name) return NextResponse.json({ error: 'Speler en naam zijn verplicht.' }, { status: 400 });

  const existing = await prisma.player.findFirst({ where: { id: playerId, sessionId: params.id } });
  if (!existing) return NextResponse.json({ error: 'Speler niet gevonden.' }, { status: 404 });
  const player = await prisma.player.update({ where: { id: playerId }, data: { name } });
  return NextResponse.json({ player: serializePlayer(player) });
}
