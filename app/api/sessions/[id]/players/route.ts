import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { serializePlayer } from '@/lib/serializers';
import { getOrCreateUserProfile } from '@/lib/user-profile';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  const body = await request.json().catch(() => ({}));
  const session = await prisma.session.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  if (userId) {
    const profile = await getOrCreateUserProfile(userId);
    const existingPlayer = await prisma.player.findFirst({
      where: { sessionId: params.id, userProfileId: profile.id }
    });

    if (existingPlayer) {
      const syncedPlayer = existingPlayer.name === profile.displayName
        ? existingPlayer
        : await prisma.player.update({
          where: { id: existingPlayer.id },
          data: { name: profile.displayName }
        });

      return NextResponse.json({ player: serializePlayer(syncedPlayer) });
    }

    const claimablePlayers = await prisma.player.findMany({
      where: {
        sessionId: params.id,
        userProfileId: null,
        name: { equals: profile.displayName, mode: 'insensitive' }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (claimablePlayers.length === 1) {
      const claimedPlayer = await prisma.player.update({
        where: { id: claimablePlayers[0].id },
        data: {
          userProfileId: profile.id,
          name: profile.displayName
        }
      });

      return NextResponse.json({ player: serializePlayer(claimedPlayer) });
    }

    const player = await prisma.player.create({
      data: {
        sessionId: params.id,
        userProfileId: profile.id,
        name: profile.displayName
      }
    });

    return NextResponse.json({ player: serializePlayer(player) });
  }

  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Naam is verplicht.' }, { status: 400 });

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
  if (existing.userProfileId) {
    return NextResponse.json({ error: 'Pas je naam aan via je profiel.' }, { status: 403 });
  }
  const player = await prisma.player.update({ where: { id: playerId }, data: { name } });
  return NextResponse.json({ player: serializePlayer(player) });
}
