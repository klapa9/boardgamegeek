import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { startCollectionSync } from '@/lib/bgg-sync';
import { getCurrentUserProfile } from '@/lib/user-profile';

export async function POST(request: Request) {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedUsername = String(body.username ?? '').trim();
  const username = requestedUsername;
  const xml = String(body.xml ?? '').trim();
  const replaceExisting = body.replace_existing === true;

  if (!username) {
    return NextResponse.json({ error: 'Geef eerst je BoardGameGeek username in.' }, { status: 400 });
  }

  const [syncState, existingBggGame] = await Promise.all([
    prisma.collectionSyncState.findUnique({ where: { userProfileId: viewerProfile.id } }),
    prisma.collectionGame.findFirst({
      where: {
        userProfileId: viewerProfile.id,
        hidden: false,
        source: 'bgg'
      },
      select: { id: true }
    })
  ]);

  const existingUsername = syncState?.bggUsername?.trim() ?? '';
  const replacingDifferentCollection = Boolean(
    existingBggGame
    && existingUsername
    && existingUsername.localeCompare(username, undefined, { sensitivity: 'accent' }) !== 0
  );

  if (replacingDifferentCollection && !replaceExisting) {
    return NextResponse.json({
      error: `Je hebt momenteel al een gesynchroniseerde collectie van ${existingUsername}. Als je doorgaat, wordt die BGG-collectie verwijderd en vervangen door ${username}.`
    }, { status: 409 });
  }

  try {
    const result = await startCollectionSync({
      userProfileId: viewerProfile.id,
      username,
      ...(xml ? { xml } : {})
    });

    return NextResponse.json(result, { status: result.started ? 202 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'BGG synchronisatie mislukt.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

