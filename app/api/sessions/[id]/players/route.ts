import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { serializePlayer } from '@/lib/serializers';
import { syncStoredUserGameRatingsForPlayer } from '@/lib/user-game-ratings';
import { getOrCreateUserProfile } from '@/lib/user-profile';
import { authorizePlayerAccess, createGuestToken, findGuestPlayerFromCookie, setGuestCookie } from '@/lib/guest-access';

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
      const syncedPlayer = await prisma.$transaction(async (tx) => {
        const nextPlayer = existingPlayer.name === profile.displayName
          ? existingPlayer
          : await tx.player.update({
            where: { id: existingPlayer.id },
            data: { name: profile.displayName }
          });

        await syncStoredUserGameRatingsForPlayer(tx, nextPlayer.id, profile.id);
        return nextPlayer;
      });

      return NextResponse.json({ player: serializePlayer(syncedPlayer) });
    }

    // Een gastspeler mag alleen aan een account gekoppeld worden door wie die gast
    // aantoonbaar is (zelfde toestel, geldige gastcookie). Op naam claimen kan niet meer.
    const claimablePlayer = await findGuestPlayerFromCookie(params.id);

    if (claimablePlayer) {
      const claimedPlayer = await prisma.$transaction(async (tx) => {
        const nextPlayer = await tx.player.update({
          where: { id: claimablePlayer.id },
          data: {
            userProfileId: profile.id,
            name: profile.displayName,
            guestTokenHash: null
          }
        });

        await syncStoredUserGameRatingsForPlayer(tx, nextPlayer.id, profile.id);
        return nextPlayer;
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

  // Deed deze gast al mee op dit toestel? Dan geen dubbele speler aanmaken.
  const existingGuest = await findGuestPlayerFromCookie(params.id);
  if (existingGuest) {
    const player = existingGuest.name === name
      ? existingGuest
      : await prisma.player.update({ where: { id: existingGuest.id }, data: { name } });
    return NextResponse.json({ player: serializePlayer(player) });
  }

  const { token, hash } = createGuestToken();
  const player = await prisma.player.create({ data: { sessionId: params.id, name, guestTokenHash: hash } });
  const response = NextResponse.json({ player: serializePlayer(player) });
  setGuestCookie(response, params.id, token);
  return response;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const name = String(body.name ?? '').trim();
  if (!playerId || !name) return NextResponse.json({ error: 'Speler en naam zijn verplicht.' }, { status: 400 });

  const access = await authorizePlayerAccess(params.id, playerId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const existing = access.player;
  if (existing.userProfileId) {
    return NextResponse.json({ error: 'Pas je naam aan via je profiel.' }, { status: 403 });
  }
  const player = await prisma.player.update({ where: { id: playerId }, data: { name } });
  return NextResponse.json({ player: serializePlayer(player) });
}
