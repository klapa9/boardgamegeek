import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { collectionGameInclude, collectionGameToSessionGameData } from '@/lib/collection-games';
import { serializeAvailability, serializeGame, serializePlayer, serializeRating, serializeSession, serializeUserProfile } from '@/lib/serializers';
import { getCurrentUserProfile, getOrCreateUserProfile } from '@/lib/user-profile';
import { ensureSessionOrganizerAccess, viewerIsOrganizer } from '@/lib/session-organizer';

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeMeetingTime(value: unknown) {
  const time = String(value ?? '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function normalizePlanningMode(value: unknown) {
  return value === 'fixed_day' ? 'fixed_day' : 'vote_dates';
}

function normalizeGameSelectionMode(value: unknown) {
  if (value === 'host_pick') return 'host_pick';
  if (value === 'no_preselect') return 'no_preselect';
  return 'players_pick';
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { dateOptions: { orderBy: { date: 'asc' } } }
  });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  const viewerProfile = userId ? await getOrCreateUserProfile(userId) : null;

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
    ratings: ratings.map(serializeRating),
    viewer_profile: viewerProfile ? serializeUserProfile(viewerProfile) : null,
    viewer_player_id: viewerProfile ? players.find((player) => player.userProfileId === viewerProfile.id)?.id ?? null : null,
    viewer_is_organizer: viewerIsOrganizer(session, viewerProfile?.id ?? null)
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { dateOptions: true }
  });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  if (Array.isArray(body.add_date_options)) {
    const viewerProfile = await getCurrentUserProfile();
    if (!viewerProfile) {
      return NextResponse.json({ error: 'Log eerst in om datumopties toe te voegen.' }, { status: 401 });
    }

    const player = await prisma.player.findFirst({
      where: {
        sessionId: params.id,
        userProfileId: viewerProfile.id
      },
      select: { id: true }
    });
    if (!player) {
      return NextResponse.json({ error: 'Alleen deelnemers van deze spelavond kunnen datumopties toevoegen.' }, { status: 403 });
    }

    const requestedDates = body.add_date_options
      .map((value: unknown) => normalizeDate(value))
      .filter((date: string | null): date is string => Boolean(date));
    const uniqueDates = new Set<string>(requestedDates);
    const datesToAdd = Array.from(uniqueDates)
      .filter((date) => !session.dateOptions.some((option) => option.date === date));

    if (!datesToAdd.length) {
      const unchangedSession = await prisma.session.findUnique({
        where: { id: params.id },
        include: { dateOptions: { orderBy: { date: 'asc' } } }
      });
      if (!unchangedSession) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
      return NextResponse.json({ session: serializeSession(unchangedSession, unchangedSession.dateOptions) });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.sessionDateOption.createMany({
        data: datesToAdd.map((date) => ({ sessionId: params.id, date }))
      });

      return tx.session.findUnique({
        where: { id: params.id },
        include: { dateOptions: { orderBy: { date: 'asc' } } }
      });
    });

    if (!updated) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
    return NextResponse.json({ session: serializeSession(updated, updated.dateOptions) });
  }

  const access = await ensureSessionOrganizerAccess(session);
  if (!access.ok) return NextResponse.json({ error: 'Alleen de organisator mag dit aanpassen.' }, { status: 403 });
  const viewerProfile = access.viewerProfile;
  if (!viewerProfile) return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });

  const isSettingsUpdate = (
    body.title !== undefined
    || body.date_options !== undefined
    || body.collection_game_ids !== undefined
    || body.planning_mode !== undefined
    || body.game_selection_mode !== undefined
    || body.meeting_time !== undefined
  );

  if (isSettingsUpdate) {
    const title = String(body.title ?? '').trim();
    const meetingTime = normalizeMeetingTime(body.meeting_time);
    const planningMode = normalizePlanningMode(body.planning_mode);
    const gameSelectionMode = normalizeGameSelectionMode(body.game_selection_mode);
    const collectionGameIds = Array.isArray(body.collection_game_ids) ? body.collection_game_ids.map(String) : [];
    const providedDates = Array.isArray(body.date_options) ? body.date_options.map(normalizeDate).filter(Boolean) as string[] : [];
    const normalizedDateOptions = Array.from(new Set(providedDates)).sort();
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

    const gamesToCreate = Array.from(
      new Map(collectionGames.map((game) => [game.title.toLowerCase(), collectionGameToSessionGameData(game)])).values()
    );

    const updatedSession = await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: params.id },
        data: {
          title,
          meetingTime,
          chosenDay,
          chosenGameId: null,
          locked
        }
      });

      await tx.availability.deleteMany({ where: { sessionId: params.id } });
      await tx.rating.deleteMany({ where: { sessionId: params.id } });
      await tx.sessionDateOption.deleteMany({ where: { sessionId: params.id } });
      await tx.game.deleteMany({ where: { sessionId: params.id } });

      await tx.sessionDateOption.createMany({
        data: normalizedDateOptions.map((date) => ({ sessionId: params.id, date }))
      });

      const createdGames = [];
      for (const game of gamesToCreate) {
        createdGames.push(await tx.game.create({ data: { sessionId: params.id, ...game } }));
      }

      if (gameSelectionMode === 'host_pick' && createdGames.length === 1) {
        await tx.session.update({
          where: { id: params.id },
          data: { chosenGameId: createdGames[0].id }
        });
      }

      return tx.session.findUnique({
        where: { id: params.id },
        include: { dateOptions: { orderBy: { date: 'asc' } } }
      });
    });

    if (!updatedSession) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
    return NextResponse.json({ session: serializeSession(updatedSession, updatedSession.dateOptions) });
  }

  let chosenDayUpdate: string | null | undefined;
  if (body.chosen_day !== undefined) {
    if (body.chosen_day === null) chosenDayUpdate = null;
    else {
      const normalizedDay = normalizeDate(body.chosen_day);
      if (!normalizedDay) return NextResponse.json({ error: 'Kies een geldige datum.' }, { status: 400 });
      chosenDayUpdate = normalizedDay;
    }
  }

  if (chosenDayUpdate && !session.dateOptions.some((option: { date: string }) => option.date === chosenDayUpdate)) {
    return NextResponse.json({ error: 'Deze datum staat niet tussen de voorstellen.' }, { status: 400 });
  }

  let chosenGameIdUpdate: string | null | undefined;
  if (body.chosen_game_id !== undefined) {
    if (body.chosen_game_id === null) chosenGameIdUpdate = null;
    else {
      const candidate = String(body.chosen_game_id).trim();
      const game = await prisma.game.findFirst({
        where: { id: candidate, sessionId: params.id },
        select: { id: true }
      });
      if (!game) return NextResponse.json({ error: 'Dit spel hoort niet bij deze sessie.' }, { status: 400 });
      chosenGameIdUpdate = game.id;
    }
  }

  let meetingTimeUpdate: string | undefined;
  if (body.meeting_time !== undefined) {
    const normalizedMeetingTime = normalizeMeetingTime(body.meeting_time);
    if (!normalizedMeetingTime) {
      return NextResponse.json({ error: 'Kies een geldig afspreekuur.' }, { status: 400 });
    }
    meetingTimeUpdate = normalizedMeetingTime;
  }

  if (body.remove_date_option !== undefined) {
    const dateToRemove = normalizeDate(body.remove_date_option);
    if (!dateToRemove) return NextResponse.json({ error: 'Kies een geldige datum.' }, { status: 400 });
    if (!session.dateOptions.some((option) => option.date === dateToRemove)) {
      return NextResponse.json({ error: 'Deze datum staat niet tussen de voorstellen.' }, { status: 400 });
    }
    if (session.dateOptions.length <= 1) {
      return NextResponse.json({ error: 'Er moet minstens 1 datumoptie overblijven.' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.sessionDateOption.deleteMany({
        where: {
          sessionId: params.id,
          date: dateToRemove
        }
      });

      const removingChosenDay = session.chosenDay === dateToRemove;
      if (removingChosenDay) {
        await tx.session.update({
          where: { id: params.id },
          data: {
            chosenDay: null,
            locked: false
          }
        });
      }

      return tx.session.findUnique({
        where: { id: params.id },
        include: { dateOptions: { orderBy: { date: 'asc' } } }
      });
    });

    if (!updated) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
    return NextResponse.json({ session: serializeSession(updated, updated.dateOptions) });
  }

  const updateData: { chosenDay?: string | null; locked?: boolean; chosenGameId?: string | null; meetingTime?: string } = {};
  if (chosenDayUpdate !== undefined) {
    updateData.chosenDay = chosenDayUpdate;
    if (chosenDayUpdate === null) {
      updateData.locked = false;
    } else if (typeof body.locked !== 'boolean') {
      updateData.locked = true;
    }
  }
  if (typeof body.locked === 'boolean') updateData.locked = body.locked;
  if (chosenGameIdUpdate !== undefined) updateData.chosenGameId = chosenGameIdUpdate;
  if (meetingTimeUpdate !== undefined) updateData.meetingTime = meetingTimeUpdate;

  const updated = await prisma.session.update({
    where: { id: params.id },
    data: updateData,
    include: { dateOptions: { orderBy: { date: 'asc' } } }
  });
  return NextResponse.json({ session: serializeSession(updated, updated.dateOptions) });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true, organizerUserProfileId: true }
  });

  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });
  const access = await ensureSessionOrganizerAccess(session);
  if (!access.ok) return NextResponse.json({ error: 'Alleen de organisator mag deze spelavond verwijderen.' }, { status: 403 });

  await prisma.session.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

