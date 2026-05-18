import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type RatingIdentity = {
  bggId: number | null;
  title: string;
};

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function normalizedTitleFilter(title: string) {
  return {
    equals: title.trim(),
    mode: 'insensitive' as const
  };
}

function ratingWhere(identity: RatingIdentity): Prisma.RatingWhereInput {
  if (identity.bggId !== null) {
    return {
      game: {
        bggId: identity.bggId
      }
    };
  }

  return {
    game: {
      bggId: null,
      title: normalizedTitleFilter(identity.title)
    }
  };
}

function collectionGameWhere(identity: RatingIdentity): Prisma.CollectionGameWhereInput {
  if (identity.bggId !== null) {
    return {
      bggId: identity.bggId
    };
  }

  return {
    bggId: null,
    title: normalizedTitleFilter(identity.title)
  };
}

export async function calculateWebsiteRating(db: DatabaseClient, identity: RatingIdentity) {
  const result = await db.rating.aggregate({
    where: ratingWhere(identity),
    _avg: {
      score: true
    }
  });

  return result._avg.score === null ? null : Number(result._avg.score.toFixed(2));
}

export async function syncStoredWebsiteRating(db: DatabaseClient, identity: RatingIdentity) {
  const websiteRating = await calculateWebsiteRating(db, identity);

  await db.collectionGame.updateMany({
    where: collectionGameWhere(identity),
    data: {
      websiteRating
    }
  });

  return websiteRating;
}
