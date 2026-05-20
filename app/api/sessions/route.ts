import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bggThingDetailsToSessionGameData, collectionGameInclude, collectionGameToSessionGameData } from '@/lib/collection-games';
import { fetchBggGamesForRequests, normalizeBggGameRequests, sessionGameKey } from '@/lib/bgg-game-details';
import { requireSignedInUser } from '@/lib/clerk-auth';
import { serializeSession } from '@/lib/serializers';
import { getCurrentUserProfile } from '@/lib/user-profile';

type PlanningMode = 'fixed_day' | 'vote_dates';
type GameSelectionMode = 'no_preselect' | 'host_pick' | 'players_pick';
type NormalizedExtraQuestion = {
  prompt: string;
  allowMultiple: boolean;
  options: {
    label: string;
  }[];
};

const MAX_MEETING_LOCATION_LENGTH = 160;

function normalizeMeetingTime(value: unknown) {
  const time = String(value ?? '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function normalizeMeetingLocation(value: unknown) {
  const location = String(value ?? '').replace(/\s+/g, ' ').trim();
  return location || null;
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

function normalizeExtraQuestions(value: unknown): NormalizedExtraQuestion[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const normalizedQuestions: NormalizedExtraQuestion[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const prompt = String(row.prompt ?? '').trim();
    const options = Array.isArray(row.options) ? row.options : null;
    if (!prompt || !options) return null;

    const normalizedOptions = options.map((option) => {
      if (!option || typeof option !== 'object') return null;
      const optionRow = option as Record<string, unknown>;
      const label = String(optionRow.label ?? '').trim();
      return label ? { label } : null;
    });

    if (normalizedOptions.some((option) => option === null)) return null;
    const validOptions = normalizedOptions.filter((option): option is { label: string } => Boolean(option));
    const distinctOptions = new Set(validOptions.map((option) => option.label.toLocaleLowerCase()));

    if (validOptions.length < 2 || distinctOptions.size !== validOptions.length) return null;

    normalizedQuestions.push({
      prompt,
      allowMultiple: Boolean(row.allow_multiple),
      options: validOptions
    });
  }

  return normalizedQuestions;
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
  const meetingLocation = normalizeMeetingLocation(body.meeting_location);
  const planningMode = normalizePlanningMode(body.planning_mode);
  const gameSelectionMode = normalizeGameSelectionMode(body.game_selection_mode);
  const collectionGameIds = Array.isArray(body.collection_game_ids) ? body.collection_game_ids.map(String) : [];
  const bggGameRequests = normalizeBggGameRequests(body.bgg_games, body.bgg_game_ids);
  const providedDates = Array.isArray(body.date_options) ? body.date_options.map(normalizeDate).filter(Boolean) as string[] : [];
  const extraQuestions = normalizeExtraQuestions(body.extra_questions);
  const dateOptions = Array.from(new Set(providedDates.length ? providedDates : defaultDateOptions())).sort();
  const normalizedDateOptions = planningMode === 'fixed_day' ? (dateOptions[0] ? [dateOptions[0]] : []) : dateOptions;
  const chosenDay = planningMode === 'fixed_day' ? normalizedDateOptions[0] ?? null : null;
  const locked = planningMode === 'fixed_day' && Boolean(chosenDay);

  if (!title) return NextResponse.json({ error: 'Titel is verplicht.' }, { status: 400 });
  if (!meetingTime) return NextResponse.json({ error: 'Kies een geldig afspreekuur.' }, { status: 400 });
  if (meetingLocation && meetingLocation.length > MAX_MEETING_LOCATION_LENGTH) {
    return NextResponse.json({ error: `Locatie mag maximaal ${MAX_MEETING_LOCATION_LENGTH} tekens bevatten.` }, { status: 400 });
  }
  if (!normalizedDateOptions.length) return NextResponse.json({ error: 'Voeg minstens een datum toe.' }, { status: 400 });
  if (extraQuestions === null) {
    return NextResponse.json({ error: 'Extra vragen moeten een vraagtekst en minstens 2 unieke antwoordopties hebben.' }, { status: 400 });
  }

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
  const bggGames = bggGameRequests.length ? await fetchBggGamesForRequests(bggGameRequests, 'session-create') : [];

  const gamesToCreate = Array.from(new Map([
    ...collectionGames.map((game) => [sessionGameKey(game), collectionGameToSessionGameData(game)] as const),
    ...bggGames.map((game) => [sessionGameKey(game), bggThingDetailsToSessionGameData(game)] as const)
  ]).values());

  const session = await prisma.session.create({
    data: {
      title,
      meetingTime,
      meetingLocation,
      organizerUserProfileId: viewerProfile.id,
      planningMode,
      gameSelectionMode,
      chosenDay,
      locked,
      dateOptions: { create: normalizedDateOptions.map((date) => ({ date })) },
      questions: {
        create: extraQuestions.map((question, questionIndex) => ({
          prompt: question.prompt,
          allowMultiple: question.allowMultiple,
          sortOrder: questionIndex,
          options: {
            create: question.options.map((option, optionIndex) => ({
              label: option.label,
              sortOrder: optionIndex
            }))
          }
        }))
      },
      ...(gamesToCreate.length ? { games: { create: gamesToCreate } } : {})
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

