import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeSessionQuestionAnswer } from '@/lib/serializers';
import { authorizePlayerAccess } from '@/lib/guest-access';

function sameSelection(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((item) => leftSet.has(item));
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({}));
  const playerId = String(body.player_id ?? '').trim();
  const submittedAnswers = Array.isArray(body.answers) ? body.answers as unknown[] : null;

  if (!playerId || !submittedAnswers) {
    return NextResponse.json({ error: 'Ongeldige antwoorden.' }, { status: 400 });
  }

  const access = await authorizePlayerAccess(params.id, playerId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const questions = await prisma.sessionQuestion.findMany({
    where: { sessionId: params.id },
    include: {
      options: {
        select: {
          id: true
        }
      },
      answers: {
        where: { playerId },
        select: {
          optionId: true
        }
      }
    }
  });

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const seenQuestionIds = new Set<string>();
  const normalizedAnswers = submittedAnswers.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return null;
    const row = entry as Record<string, unknown>;
    const questionId = String(row.question_id ?? '').trim();
    const optionIds = Array.isArray(row.option_ids)
      ? Array.from(new Set(row.option_ids.map((value) => String(value).trim()).filter(Boolean)))
      : null;

    if (!questionId || !optionIds) return null;
    if (seenQuestionIds.has(questionId)) return null;
    seenQuestionIds.add(questionId);

    const question = questionById.get(questionId);
    if (!question) return null;
    if (!question.allowMultiple && optionIds.length > 1) return null;

    const validOptionIds = new Set(question.options.map((option) => option.id));
    if (optionIds.some((optionId) => !validOptionIds.has(optionId))) return null;

    const existingOptionIds = question.answers.map((answer) => answer.optionId);
    if (question.locked && existingOptionIds.length > 0 && !sameSelection(existingOptionIds, optionIds)) return null;

    return {
      question,
      optionIds
    };
  });

  if (normalizedAnswers.some((entry) => entry === null)) {
    return NextResponse.json({ error: 'Eén of meer vraagantwoorden zijn ongeldig of vergrendeld.' }, { status: 400 });
  }

  const validAnswers = normalizedAnswers.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  await prisma.$transaction(async (tx) => {
    for (const entry of validAnswers) {
      const existingOptionIds = entry.question.answers.map((answer) => answer.optionId);
      if (entry.question.locked && existingOptionIds.length > 0 && sameSelection(existingOptionIds, entry.optionIds)) {
        continue;
      }

      await tx.sessionQuestionAnswer.deleteMany({
        where: {
          questionId: entry.question.id,
          playerId
        }
      });

      if (entry.optionIds.length) {
        await tx.sessionQuestionAnswer.createMany({
          data: entry.optionIds.map((optionId) => ({
            questionId: entry.question.id,
            optionId,
            playerId
          }))
        });
      }
    }
  });

  const questionAnswers = await prisma.sessionQuestionAnswer.findMany({
    where: {
      question: {
        is: {
          sessionId: params.id
        }
      }
    }
  });

  return NextResponse.json({
    question_answers: questionAnswers.map(serializeSessionQuestionAnswer)
  });
}
