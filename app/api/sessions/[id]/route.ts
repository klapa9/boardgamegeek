import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bggThingDetailsToSessionGameData, collectionGameInclude, collectionGameToSessionGameData, SessionGameData } from '@/lib/collection-games';
import { fetchBggGamesForRequests, normalizeBggGameRequests, sessionGameKey } from '@/lib/bgg-game-details';
import { serializeAvailability, serializeGame, serializePlayer, serializeRating, serializeSession, serializeSessionQuestion, serializeSessionQuestionAnswer, serializeUserProfile } from '@/lib/serializers';
import { getCurrentUserProfile, getOrCreateUserProfile } from '@/lib/user-profile';
import { ensureSessionOrganizerAccess, viewerIsOrganizer } from '@/lib/session-organizer';
import { readGuestTokenHash } from '@/lib/guest-access';

type GameSelectionMode = 'no_preselect' | 'host_pick' | 'players_pick';
type NormalizedExtraQuestionOption = {
  id: string | null;
  label: string;
};
type NormalizedExtraQuestion = {
  id: string | null;
  prompt: string;
  allowMultiple: boolean;
  options: NormalizedExtraQuestionOption[];
};

const MAX_MEETING_LOCATION_LENGTH = 160;

function normalizeDate(value: unknown) {
  const date = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeMeetingTime(value: unknown) {
  const time = String(value ?? '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function normalizeMeetingLocation(value: unknown) {
  const location = String(value ?? '').replace(/\s+/g, ' ').trim();
  return location || null;
}

function normalizePlanningMode(value: unknown) {
  return value === 'fixed_day' ? 'fixed_day' : 'vote_dates';
}

function normalizeGameSelectionMode(value: unknown) {
  if (value === 'host_pick') return 'host_pick';
  if (value === 'no_preselect') return 'no_preselect';
  return 'players_pick';
}

function normalizeExtraQuestions(value: unknown): NormalizedExtraQuestion[] | null {
  if (!Array.isArray(value)) return null;

  const normalizedQuestions: NormalizedExtraQuestion[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const prompt = String(row.prompt ?? '').trim();
    const options = Array.isArray(row.options) ? row.options : null;
    if (!prompt || !options) return null;

    const normalizedOptions: NormalizedExtraQuestionOption[] = [];
    for (const option of options) {
      if (!option || typeof option !== 'object') return null;
      const optionRow = option as Record<string, unknown>;
      const label = String(optionRow.label ?? '').trim();
      if (!label) return null;
      normalizedOptions.push({
        id: typeof optionRow.id === 'string' && optionRow.id.trim() ? optionRow.id.trim() : null,
        label
      });
    }

    const distinctOptions = new Set(normalizedOptions.map((option) => option.label.toLocaleLowerCase()));
    if (normalizedOptions.length < 2 || distinctOptions.size !== normalizedOptions.length) return null;

    normalizedQuestions.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : null,
      prompt,
      allowMultiple: Boolean(row.allow_multiple),
      options: normalizedOptions
    });
  }

  return normalizedQuestions;
}

async function reconcileSessionQuestions(
  tx: Prisma.TransactionClient,
  sessionId: string,
  questions: NormalizedExtraQuestion[]
) {
  const existingQuestions = await tx.sessionQuestion.findMany({
    where: { sessionId },
    include: {
      options: { orderBy: { sortOrder: 'asc' } }
    },
    orderBy: { sortOrder: 'asc' }
  });

  const keptQuestionIds = new Set<string>();

  for (const [questionIndex, question] of questions.entries()) {
    const existingQuestion = question.id
      ? existingQuestions.find((item) => item.id === question.id) ?? null
      : null;

    let questionId = existingQuestion?.id ?? null;

    if (existingQuestion) {
      await tx.sessionQuestion.update({
        where: { id: existingQuestion.id },
        data: {
          prompt: question.prompt,
          allowMultiple: question.allowMultiple,
          sortOrder: questionIndex
        }
      });
    } else {
      const createdQuestion = await tx.sessionQuestion.create({
        data: {
          sessionId,
          prompt: question.prompt,
          allowMultiple: question.allowMultiple,
          sortOrder: questionIndex
        }
      });
      questionId = createdQuestion.id;
    }

    if (!questionId) continue;
    keptQuestionIds.add(questionId);

    const questionOptions = existingQuestion?.options ?? [];
    const keptOptionIds = new Set<string>();

    for (const [optionIndex, option] of question.options.entries()) {
      const existingOption = option.id
        ? questionOptions.find((item) => item.id === option.id) ?? null
        : null;

      if (existingOption) {
        keptOptionIds.add(existingOption.id);
        await tx.sessionQuestionOption.update({
          where: { id: existingOption.id },
          data: {
            label: option.label,
            sortOrder: optionIndex
          }
        });
      } else {
        const createdOption = await tx.sessionQuestionOption.create({
          data: {
            questionId,
            label: option.label,
            sortOrder: optionIndex
          }
        });
        keptOptionIds.add(createdOption.id);
      }
    }

    const removedOptionIds = questionOptions
      .filter((option) => !keptOptionIds.has(option.id))
      .map((option) => option.id);

    if (removedOptionIds.length) {
      await tx.sessionQuestionAnswer.deleteMany({
        where: {
          questionId,
          optionId: { in: removedOptionIds }
        }
      });
      await tx.sessionQuestionOption.deleteMany({
        where: {
          id: { in: removedOptionIds }
        }
      });
    }

    if (existingQuestion?.chosenOptionId && removedOptionIds.includes(existingQuestion.chosenOptionId)) {
      await tx.sessionQuestion.update({
        where: { id: questionId },
        data: { chosenOptionId: null }
      });
    }

    if (!question.allowMultiple) {
      const currentAnswers = await tx.sessionQuestionAnswer.findMany({
        where: { questionId },
        include: {
          option: {
            select: {
              id: true,
              sortOrder: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const extrasToDelete: string[] = [];
      const answersByPlayer = new Map<string, typeof currentAnswers>();

      currentAnswers.forEach((answer) => {
        const list = answersByPlayer.get(answer.playerId);
        if (list) {
          list.push(answer);
          return;
        }
        answersByPlayer.set(answer.playerId, [answer]);
      });

      answersByPlayer.forEach((answers) => {
        if (answers.length <= 1) return;
        const orderedAnswers = [...answers].sort((left, right) => (
          left.option.sortOrder - right.option.sortOrder
          || left.createdAt.getTime() - right.createdAt.getTime()
        ));
        orderedAnswers.slice(1).forEach((answer) => extrasToDelete.push(answer.id));
      });

      if (extrasToDelete.length) {
        await tx.sessionQuestionAnswer.deleteMany({
          where: {
            id: { in: extrasToDelete }
          }
        });
      }
    }
  }

  const removedQuestionIds = existingQuestions
    .filter((question) => !keptQuestionIds.has(question.id))
    .map((question) => question.id);

  if (removedQuestionIds.length) {
    await tx.sessionQuestion.deleteMany({
      where: {
        id: { in: removedQuestionIds }
      }
    });
  }
}

async function resetSessionGamesAndDates(
  tx: Prisma.TransactionClient,
  sessionId: string,
  {
    title,
    meetingTime,
    meetingLocation,
    planningMode,
    gameSelectionMode,
    chosenDay,
    locked,
    normalizedDateOptions,
    gamesToCreate
  }: {
    title: string;
    meetingTime: string;
    meetingLocation: string | null;
    planningMode: 'fixed_day' | 'vote_dates';
    gameSelectionMode: GameSelectionMode;
    chosenDay: string | null;
    locked: boolean;
    normalizedDateOptions: string[];
    gamesToCreate: SessionGameData[];
  }
) {
  await tx.session.update({
    where: { id: sessionId },
    data: {
      title,
      meetingTime,
      meetingLocation,
      planningMode,
      gameSelectionMode,
      chosenDay,
      chosenGameId: null,
      locked
    }
  });

  await tx.availability.deleteMany({ where: { sessionId } });
  await tx.rating.deleteMany({ where: { sessionId } });
  await tx.sessionDateOption.deleteMany({ where: { sessionId } });
  await tx.game.deleteMany({ where: { sessionId } });

  await tx.sessionDateOption.createMany({
    data: normalizedDateOptions.map((date) => ({ sessionId, date }))
  });

  const createdGames = [];
  for (const game of gamesToCreate) {
    createdGames.push(await tx.game.create({ data: { sessionId, ...game } }));
  }

  if (gameSelectionMode === 'host_pick' && createdGames.length === 1) {
    await tx.session.update({
      where: { id: sessionId },
      data: { chosenGameId: createdGames[0].id }
    });
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { dateOptions: { orderBy: { date: 'asc' } } }
  });
  if (!session) return NextResponse.json({ error: 'Sessie niet gevonden.' }, { status: 404 });

  const viewerProfile = userId ? await getOrCreateUserProfile(userId) : null;
  const guestHash = viewerProfile ? null : readGuestTokenHash(params.id);

  const [players, games, availability, ratings, questions, questionAnswers] = await Promise.all([
    prisma.player.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } }),
    prisma.game.findMany({ where: { sessionId: params.id }, orderBy: { createdAt: 'asc' } }),
    prisma.availability.findMany({ where: { sessionId: params.id } }),
    prisma.rating.findMany({ where: { sessionId: params.id } }),
    prisma.sessionQuestion.findMany({
      where: { sessionId: params.id },
      include: {
        options: { orderBy: { sortOrder: 'asc' } }
      },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.sessionQuestionAnswer.findMany({
      where: {
        question: {
          is: {
            sessionId: params.id
          }
        }
      }
    })
  ]);

  return NextResponse.json({
    session: serializeSession(session, session.dateOptions),
    players: players.map(serializePlayer),
    games: games.map(serializeGame),
    availability: availability.map(serializeAvailability),
    ratings: ratings.map(serializeRating),
    questions: questions.map((question) => serializeSessionQuestion(question, question.options)),
    question_answers: questionAnswers.map(serializeSessionQuestionAnswer),
    viewer_profile: viewerProfile ? serializeUserProfile(viewerProfile) : null,
    viewer_player_id: viewerProfile
      ? players.find((player) => player.userProfileId === viewerProfile.id)?.id ?? null
      : guestHash
        ? players.find((player) => !player.userProfileId && player.guestTokenHash === guestHash)?.id ?? null
        : null,
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
    if (session.locked) {
      return NextResponse.json({ error: 'De planning ligt vast. Heropen de planning om datumopties toe te voegen.' }, { status: 400 });
    }

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
    || body.bgg_games !== undefined
    || body.bgg_game_ids !== undefined
    || body.planning_mode !== undefined
    || body.game_selection_mode !== undefined
    || body.extra_questions !== undefined
  );

  if (isSettingsUpdate) {
    const title = String(body.title ?? '').trim();
    const meetingTime = normalizeMeetingTime(body.meeting_time);
    const meetingLocation = normalizeMeetingLocation(body.meeting_location);
    const planningMode = normalizePlanningMode(body.planning_mode);
    const gameSelectionMode = normalizeGameSelectionMode(body.game_selection_mode);
    const collectionGameIds = Array.isArray(body.collection_game_ids) ? body.collection_game_ids.map(String) : [];
    const bggGameRequests = normalizeBggGameRequests(body.bgg_games, body.bgg_game_ids);
    const providedDates = Array.isArray(body.date_options) ? body.date_options.map(normalizeDate).filter(Boolean) as string[] : [];
    const normalizedDateOptions = Array.from(new Set(providedDates)).sort();
    const chosenDay = planningMode === 'fixed_day' ? normalizedDateOptions[0] ?? null : null;
    const locked = planningMode === 'fixed_day' && Boolean(chosenDay);
    const extraQuestions = body.extra_questions === undefined ? null : normalizeExtraQuestions(body.extra_questions);

    if (!title) return NextResponse.json({ error: 'Titel is verplicht.' }, { status: 400 });
    if (!meetingTime) return NextResponse.json({ error: 'Kies een geldig afspreekuur.' }, { status: 400 });
    if (meetingLocation && meetingLocation.length > MAX_MEETING_LOCATION_LENGTH) {
      return NextResponse.json({ error: `Locatie mag maximaal ${MAX_MEETING_LOCATION_LENGTH} tekens bevatten.` }, { status: 400 });
    }
    if (!normalizedDateOptions.length) return NextResponse.json({ error: 'Voeg minstens een datum toe.' }, { status: 400 });
    if (extraQuestions === null && body.extra_questions !== undefined) {
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
    const bggGames = bggGameRequests.length ? await fetchBggGamesForRequests(bggGameRequests, 'session-update') : [];

    const gamesToCreate = Array.from(new Map([
      ...collectionGames.map((game) => [sessionGameKey(game), collectionGameToSessionGameData(game)] as const),
      ...bggGames.map((game) => [sessionGameKey(game), bggThingDetailsToSessionGameData(game)] as const)
    ]).values());

    const updatedSession = await prisma.$transaction(async (tx) => {
      await resetSessionGamesAndDates(tx, params.id, {
        title,
        meetingTime,
        meetingLocation,
        planningMode,
        gameSelectionMode,
        chosenDay,
        locked,
        normalizedDateOptions,
        gamesToCreate
      });

      if (extraQuestions !== null) {
        await reconcileSessionQuestions(tx, params.id, extraQuestions);
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

  let meetingLocationUpdate: string | null | undefined;
  if (body.meeting_location !== undefined) {
    const normalizedMeetingLocation = normalizeMeetingLocation(body.meeting_location);
    if (normalizedMeetingLocation && normalizedMeetingLocation.length > MAX_MEETING_LOCATION_LENGTH) {
      return NextResponse.json({ error: `Locatie mag maximaal ${MAX_MEETING_LOCATION_LENGTH} tekens bevatten.` }, { status: 400 });
    }
    meetingLocationUpdate = normalizedMeetingLocation;
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

  const updateData: { chosenDay?: string | null; locked?: boolean; chosenGameId?: string | null; meetingTime?: string; meetingLocation?: string | null } = {};
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
  if (meetingLocationUpdate !== undefined) updateData.meetingLocation = meetingLocationUpdate;

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

