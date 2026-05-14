import { NextResponse } from 'next/server';
import { collectionGroupInclude } from '@/lib/collection-groups';
import { prisma } from '@/lib/db';
import { serializeCollectionGroup } from '@/lib/serializers';
import { getCurrentUserProfile } from '@/lib/user-profile';

function normalizeName(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(
    value
      .map((entry) => String(entry).trim())
      .filter((entry): entry is string => entry.length > 0)
  ));
}

function isReservedName(name: string) {
  return name.toLowerCase() === 'alle spellen';
}

export async function POST(request: Request) {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  const gameIds = normalizeIdList(body.game_ids);

  if (!name) return NextResponse.json({ error: 'Geef deze groep een naam.' }, { status: 400 });
  if (isReservedName(name)) return NextResponse.json({ error: '"Alle spellen" is al de standaardgroep.' }, { status: 409 });

  const [duplicate, games] = await Promise.all([
    prisma.collectionGroup.findFirst({
      where: {
        userProfileId: viewerProfile.id,
        name: { equals: name, mode: 'insensitive' }
      },
      select: { id: true }
    }),
    gameIds.length
      ? prisma.collectionGame.findMany({
        where: {
          id: { in: gameIds },
          userProfileId: viewerProfile.id,
          hidden: false
        },
        select: { id: true }
      })
      : Promise.resolve([])
  ]);

  if (duplicate) return NextResponse.json({ error: 'Deze groep bestaat al.' }, { status: 409 });
  if (games.length !== gameIds.length) return NextResponse.json({ error: 'Niet elk gekozen spel bestaat nog.' }, { status: 400 });

  const group = await prisma.$transaction(async (tx) => {
    const createdGroup = await tx.collectionGroup.create({
      data: {
        userProfileId: viewerProfile.id,
        name
      }
    });

    if (gameIds.length) {
      await tx.collectionGroupGame.createMany({
        data: gameIds.map((collectionGameId) => ({ groupId: createdGroup.id, collectionGameId }))
      });
    }

    return tx.collectionGroup.findUniqueOrThrow({
      where: { id: createdGroup.id },
      include: collectionGroupInclude
    });
  });

  return NextResponse.json({ group: serializeCollectionGroup(group) });
}
