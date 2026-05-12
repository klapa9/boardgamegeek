import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeAvailability } from '@/lib/serializers';

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const day = normalizeDate(body.day);
  const available = Boolean(body.available);

  if (!playerId || !day) return NextResponse.json({ error: 'Ongeldige beschikbaarheid.' }, { status: 400 });

  const [player, dateOption] = await Promise.all([
    prisma.player.findFirst({ where: { id: playerId, sessionId: params.id } }),
    prisma.sessionDateOption.findFirst({ where: { sessionId: params.id, date: day } })
  ]);
  if (!player) return NextResponse.json({ error: 'Je moet deelnemen om beschikbaarheid op te slaan.' }, { status: 403 });
  if (!dateOption) return NextResponse.json({ error: 'Deze datum staat niet tussen de voorstellen.' }, { status: 400 });

  const item = await prisma.availability.upsert({
    where: { playerId_day: { playerId, day } },
    update: { available },
    create: { sessionId: params.id, playerId, day, available }
  });

  return NextResponse.json({ availability: serializeAvailability(item) });
}
