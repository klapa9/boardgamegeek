import { NextResponse } from 'next/server';
import { collectionGroupInclude } from '@/lib/collection-groups';
import { prisma } from '@/lib/db';
import { serializeCollectionGroup } from '@/lib/serializers';
import { getCurrentUserProfile } from '@/lib/user-profile';

function normalizeName(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return null;

  return Array.from(new Set(
    value
      .map((entry) => String(entry).trim())
      .filter((entry): entry is string => entry.length > 0)
  ));
}

function isReservedName(name: string) {
  return name.toLowerCase() === 'alle spellen';
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const nextName = body.name === undefined ? undefined : normalizeName(body.name);
  const gameIds = body.game_ids === undefined ? undefined : normalizeIdList(body.game_ids);

  if (gameIds === null) return NextResponse.json({ error: 'game_ids moet een lijst zijn.' }, { status: 400 });
  if (nextName !== undefined && !nextName) return NextResponse.json({ error: 'De naam mag niet leeg zijn.' }, { status: 400 });
  if (nextName !== undefined && isReservedName(nextName)) {
    return NextResponse.json({ error: '"Alle spellen" is al de standaardgroep.' }, { status: 409 });
  }
  if (nextName === undefined && gameIds === undefined) {
    return NextResponse.json({ error: 'Er is niets om bij te werken.' }, { status: 400 });
  }

  const [group, duplicate, games] = await Promise.all([
    prisma.collectionGroup.findFirst({
      where: {
        id: params.id,
        userProfileId: viewerProfile.id
      },
      select: { id: true }
    }),
    nextName === undefined
      ? Promise.resolve(null)
      : prisma.collectionGroup.findFirst({
        where: {
          id: { not: params.id },
          userProfileId: viewerProfile.id,
          name: { equals: nextName, mode: 'insensitive' }
        },
        select: { id: true }
      }),
    gameIds && gameIds.length
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

  if (!group) return NextResponse.json({ error: 'Groep niet gevonden.' }, { status: 404 });
  if (duplicate) return NextResponse.json({ error: 'Deze groep bestaat al.' }, { status: 409 });
  if (gameIds && games.length !== gameIds.length) return NextResponse.json({ error: 'Niet elk gekozen spel bestaat nog.' }, { status: 400 });

  const updatedGroup = await prisma.$transaction(async (tx) => {
    if (nextName !== undefined) {
      await tx.collectionGroup.update({ where: { id: params.id }, data: { name: nextName } });
    }

    if (gameIds !== undefined) {
      await tx.collectionGroupGame.deleteMany({ where: { groupId: params.id } });

      if (gameIds.length) {
        await tx.collectionGroupGame.createMany({
          data: gameIds.map((collectionGameId) => ({ groupId: params.id, collectionGameId }))
        });
      }
    }

    return tx.collectionGroup.findUniqueOrThrow({
      where: { id: params.id },
      include: collectionGroupInclude
    });
  });

  return NextResponse.json({ group: serializeCollectionGroup(updatedGroup) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const viewerProfile = await getCurrentUserProfile();
  if (!viewerProfile) {
    return NextResponse.json({ error: 'Je moet eerst inloggen om deze actie uit te voeren.' }, { status: 401 });
  }

  const group = await prisma.collectionGroup.findFirst({
    where: {
      id: params.id,
      userProfileId: viewerProfile.id
    },
    select: { id: true }
  });
  if (!group) return NextResponse.json({ error: 'Groep niet gevonden.' }, { status: 404 });

  await prisma.collectionGroup.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
