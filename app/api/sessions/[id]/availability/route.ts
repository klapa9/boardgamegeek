import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DAYS } from '@/lib/types';
import { serializeAvailability } from '@/lib/serializers';

const validDays = new Set(DAYS.map((d) => d.key));

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const day = String(body.day ?? '').trim();
  const available = Boolean(body.available);

  if (!playerId || !validDays.has(day as any)) return NextResponse.json({ error: 'Ongeldige beschikbaarheid.' }, { status: 400 });

  const item = await prisma.availability.upsert({
    where: { playerId_day: { playerId, day } },
    update: { available },
    create: { sessionId: params.id, playerId, day, available }
  });

  return NextResponse.json({ availability: serializeAvailability(item) });
}
