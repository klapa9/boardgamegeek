import { NextResponse } from 'next/server';
import { requireSignedInUser } from '@/lib/clerk-auth';
import { prisma } from '@/lib/db';
import { getCurrentUserProfile } from '@/lib/user-profile';

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 1000;
const SUBMISSION_COOLDOWN_MS = 5 * 60 * 1000;
const DAILY_LIMIT = 5;
const DUPLICATE_LOOKBACK_DAYS = 30;

function normalizeMessage(value: unknown) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .trim();
}

function normalizedMessageKey(value: string) {
  return value
    .toLocaleLowerCase('nl-NL')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  if (!host) return true;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host && originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = await requireSignedInUser();
  if (unauthorizedResponse) return unauthorizedResponse;

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 403 });
  }

  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om een melding door te sturen.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const company = String((body as Record<string, unknown>).company ?? '').trim();
  if (company) {
    return NextResponse.json({
      ok: true,
      message: 'Bedankt, je melding is ontvangen.'
    });
  }

  const message = normalizeMessage((body as Record<string, unknown>).message);
  if (message.length < MIN_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Beschrijf je idee of bug iets uitgebreider (${MIN_MESSAGE_LENGTH}+ tekens).` },
      { status: 400 }
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Hou je melding onder de ${MAX_MESSAGE_LENGTH} tekens.` },
      { status: 400 }
    );
  }

  const normalizedMessage = normalizedMessageKey(message);
  const now = Date.now();
  const cooldownThreshold = new Date(now - SUBMISSION_COOLDOWN_MS);
  const dailyThreshold = new Date(now - 24 * 60 * 60 * 1000);
  const duplicateThreshold = new Date(now - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [recentSubmission, dailyCount, duplicateSubmission] = await Promise.all([
    prisma.feedbackRequest.findFirst({
      where: {
        userProfileId: viewerProfile.id,
        createdAt: { gte: cooldownThreshold }
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    }),
    prisma.feedbackRequest.count({
      where: {
        userProfileId: viewerProfile.id,
        createdAt: { gte: dailyThreshold }
      }
    }),
    prisma.feedbackRequest.findFirst({
      where: {
        userProfileId: viewerProfile.id,
        normalizedMessage,
        createdAt: { gte: duplicateThreshold }
      },
      select: { id: true }
    })
  ]);

  if (recentSubmission) {
    return NextResponse.json(
      { error: 'Je stuurde net al iets door. Wacht heel even en probeer daarna opnieuw.' },
      { status: 429 }
    );
  }

  if (dailyCount >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: 'Je hebt vandaag al meerdere meldingen doorgestuurd. Probeer het morgen opnieuw.' },
      { status: 429 }
    );
  }

  if (duplicateSubmission) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      message: 'Deze melding lijkt al binnen te zijn. Bedankt, we nemen ze mee.'
    });
  }

  await prisma.feedbackRequest.create({
    data: {
      userProfileId: viewerProfile.id,
      message,
      normalizedMessage
    }
  });

  return NextResponse.json(
    {
      ok: true,
      message: 'Bedankt! We hebben je idee of bug ontvangen en bekijken het graag.'
    },
    { status: 201 }
  );
}
