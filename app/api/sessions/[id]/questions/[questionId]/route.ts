import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { serializeSessionQuestion } from '@/lib/serializers';
import { ensureSessionOrganizerAccess } from '@/lib/session-organizer';

export async function PATCH(request: Request, { params }: { params: { id: string; questionId: string } }) {
  const body = await request.json().catch(() => ({}));
  const question = await prisma.sessionQuestion.findFirst({
    where: {
      id: params.questionId,
      sessionId: params.id
    },
    include: {
      options: { orderBy: { sortOrder: 'asc' } },
      session: {
        select: {
          id: true,
          organizerUserProfileId: true
        }
      }
    }
  });

  if (!question) {
    return NextResponse.json({ error: 'Vraag niet gevonden.' }, { status: 404 });
  }

  const access = await ensureSessionOrganizerAccess(question.session);
  if (!access.ok) {
    return NextResponse.json({ error: 'Alleen de organisator mag dit aanpassen.' }, { status: 403 });
  }

  let lockedUpdate: boolean | undefined;
  if (body.locked !== undefined) {
    if (typeof body.locked !== 'boolean') {
      return NextResponse.json({ error: 'Vergrendeling moet waar of onwaar zijn.' }, { status: 400 });
    }
    lockedUpdate = body.locked;
  }

  let chosenOptionIdUpdate: string | null | undefined;
  if (body.chosen_option_id !== undefined) {
    if (body.chosen_option_id === null) {
      chosenOptionIdUpdate = null;
    } else {
      const candidate = String(body.chosen_option_id ?? '').trim();
      if (!candidate || !question.options.some((option) => option.id === candidate)) {
        return NextResponse.json({ error: 'Deze antwoordoptie hoort niet bij deze vraag.' }, { status: 400 });
      }
      chosenOptionIdUpdate = candidate;
    }
  }

  const updatedQuestion = await prisma.sessionQuestion.update({
    where: { id: question.id },
    data: {
      ...(lockedUpdate === undefined ? {} : { locked: lockedUpdate }),
      ...(chosenOptionIdUpdate === undefined ? {} : { chosenOptionId: chosenOptionIdUpdate })
    },
    include: {
      options: { orderBy: { sortOrder: 'asc' } }
    }
  });

  return NextResponse.json({
    question: serializeSessionQuestion(updatedQuestion, updatedQuestion.options)
  });
}
