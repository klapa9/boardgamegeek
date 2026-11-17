import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeAvailability } from '@/lib/serializers';
import { authorizePlayerAccess } from '@/lib/guest-access';

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeAvailability(value: unknown) {
  if (value === true || value === false || value === null) return value;
  return undefined;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const day = normalizeDate(body.day);
  const available = normalizeAvailability(body.available);

  if (!playerId || !day || available === undefined) return NextResponse.json({ error: 'Ongeldige beschikbaarheid.' }, { status: 400 });

  const [access, dateOption] = await Promise.all([
    authorizePlayerAccess(params.id, playerId),
    prisma.sessionDateOption.findFirst({ where: { sessionId: params.id, date: day } })
  ]);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!dateOption) return NextResponse.json({ error: 'Deze datum staat niet tussen de voorstellen.' }, { status: 400 });

  const item = await prisma.availability.upsert({
    where: { playerId_day: { playerId, day } },
    update: { available },
    create: { sessionId: params.id, playerId, day, available }
  });

  return NextResponse.json({ availability: serializeAvailability(item) });
}
