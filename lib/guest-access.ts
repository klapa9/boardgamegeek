import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Player } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUserProfile } from '@/lib/user-profile';

/*
 * Gasttoegang per spelavond.
 *
 * Een gast zonder account krijgt bij het meedoen een willekeurige sleutel in een
 * httpOnly-cookie. In de database staat alleen de SHA-256-hash (`Player.guestTokenHash`).
 * Een speler-id alleen is dus nooit genoeg om namens iemand te stemmen: de server
 * controleert bij elke actie of de aanvrager die speler echt bezit.
 *
 * - Speler gekoppeld aan een account → alleen dat ingelogde account.
 * - Gastspeler → alleen wie de bijhorende gastcookie heeft.
 */

const GUEST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function guestCookieName(sessionId: string) {
  return `mg_guest_${sessionId}`;
}

export function hashGuestToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createGuestToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashGuestToken(token) };
}

export function setGuestCookie(response: NextResponse, sessionId: string, token: string) {
  response.cookies.set(guestCookieName(sessionId), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS
  });
}

export function readGuestTokenHash(sessionId: string) {
  const token = cookies().get(guestCookieName(sessionId))?.value;
  return token ? hashGuestToken(token) : null;
}

function hashesMatch(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/** Gastspeler in deze sessie die bij de cookie van de aanvrager hoort, of null. */
export async function findGuestPlayerFromCookie(sessionId: string) {
  const guestHash = readGuestTokenHash(sessionId);
  if (!guestHash) return null;

  return prisma.player.findFirst({
    where: {
      sessionId,
      userProfileId: null,
      guestTokenHash: guestHash
    }
  });
}

type PlayerAccessResult =
  | { ok: true; player: Player }
  | { ok: false; status: 403 | 404; error: string };

/**
 * Controleert of de aanvrager acties mag uitvoeren voor `playerId` in deze sessie.
 * Gebruik dit in elke route die iets namens een speler opslaat.
 */
export async function authorizePlayerAccess(sessionId: string, playerId: string): Promise<PlayerAccessResult> {
  if (!playerId) {
    return { ok: false, status: 403, error: 'Je moet deelnemen om dit op te slaan.' };
  }

  const player = await prisma.player.findFirst({ where: { id: playerId, sessionId } });
  if (!player) {
    return { ok: false, status: 404, error: 'Speler niet gevonden voor deze spelavond.' };
  }

  if (player.userProfileId) {
    const viewerProfile = await getCurrentUserProfile();
    if (viewerProfile?.id === player.userProfileId) {
      return { ok: true, player };
    }
    return { ok: false, status: 403, error: 'Je kan alleen je eigen antwoorden aanpassen.' };
  }

  if (hashesMatch(player.guestTokenHash, readGuestTokenHash(sessionId))) {
    return { ok: true, player };
  }

  return {
    ok: false,
    status: 403,
    error: 'Je kan alleen je eigen antwoorden aanpassen. Doe opnieuw mee via de uitnodiging als je van toestel wisselde.'
  };
}
