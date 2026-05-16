import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { collectionGameInclude, collectionGameToSessionGameData } from '@/lib/collection-games';
import { requireSignedInUser } from '@/lib/clerk-auth';
import { serializeSession } from '@/lib/serializers';
import { getCurrentUserProfile } from '@/lib/user-profile';

type PlanningMode = 'fixed_day' | 'vote_dates';
type GameSelectionMode = 'no_preselect' | 'host_pick' | 'players_pick';

function normalizeMeetingTime(value: unknown) {
  const time = String(value ?? '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizePlanningMode(value: unknown): PlanningMode {
  return value === 'fixed_day' ? 'fixed_day' : 'vote_dates';
}

function normalizeGameSelectionMode(value: unknown): GameSelectionMode {
  if (value === 'host_pick') return 'host_pick';
  if (value === 'no_preselect') return 'no_preselect';
  return 'players_pick';
}

function defaultDateOptions() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireSignedInUser();
  if (unauthorizedResponse) return unauthorizedResponse;
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const meetingTime = normalizeMeetingTime(body.meeting_time);
  const planningMode = normalizePlanningMode(body.planning_mode);
  const gameSelectionMode = normalizeGameSelectionMode(body.game_selection_mode);
  const collectionGameIds = Array.isArray(body.collection_game_ids) ? body.collection_game_ids.map(String) : [];
  const providedDates = Array.isArray(body.date_options) ? body.date_options.map(normalizeDate).filter(Boolean) as string[] : [];
  const dateOptions = Array.from(new Set(providedDates.length ? providedDates : defaultDateOptions())).sort();
  const normalizedDateOptions = planningMode === 'fixed_day' ? (dateOptions[0] ? [dateOptions[0]] : []) : dateOptions;
  const chosenDay = planningMode === 'fixed_day' ? normalizedDateOptions[0] ?? null : null;
  const locked = planningMode === 'fixed_day' && Boolean(chosenDay);

  if (!title) return NextResponse.json({ error: 'Titel is verplicht.' }, { status: 400 });
  if (!meetingTime) return NextResponse.json({ error: 'Kies een geldig afspreekuur.' }, { status: 400 });
  if (!normalizedDateOptions.length) return NextResponse.json({ error: 'Voeg minstens een datum toe.' }, { status: 400 });

  const collectionGames = collectionGameIds.length
    ? await prisma.collectionGame.findMany({
      include: collectionGameInclude,
      where: {
        id: { in: collectionGameIds },
        userProfileId: viewerProfile.id,
        hidden: false
      }
    })
    : [];

  const gamesFromCollection = Array.from(
    new Map(collectionGames.map((game) => [game.title.toLowerCase(), collectionGameToSessionGameData(game)])).values()
  );

  const session = await prisma.session.create({
    data: {
      title,
      meetingTime,
      organizerUserProfileId: viewerProfile.id,
      planningMode,
      gameSelectionMode,
      chosenDay,
      locked,
      dateOptions: { create: normalizedDateOptions.map((date) => ({ date })) },
      ...(gamesFromCollection.length ? { games: { create: gamesFromCollection } } : {})
    },
    include: {
      dateOptions: { orderBy: { date: 'asc' } },
      games: { orderBy: { createdAt: 'asc' } }
    }
  });

  let responseSession = session;
  if (gameSelectionMode === 'host_pick' && session.games.length === 1) {
    responseSession = await prisma.session.update({
      where: { id: session.id },
      data: { chosenGameId: session.games[0].id },
      include: {
        dateOptions: { orderBy: { date: 'asc' } },
        games: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  return NextResponse.json({ session: serializeSession(responseSession, responseSession.dateOptions) });
}

