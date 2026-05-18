import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

type GameSnapshot = {
  userProfileId: string;
  bggId: number | null;
  title: string;
  yearPublished: number | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
};

function normalizedTitleFilter(title: string) {
  return {
    equals: title.trim(),
    mode: 'insensitive' as const
  };
}

export function userGameRatingKey(game: Pick<GameSnapshot, 'bggId' | 'title'>) {
  return game.bggId !== null
    ? `bgg:${game.bggId}`
    : `title:${game.title.trim().toLowerCase()}`;
}

function userRatingWhere(
  userProfileId: string,
  game: Pick<GameSnapshot, 'bggId' | 'title'>
): Prisma.RatingWhereInput {
  if (game.bggId !== null) {
    return {
      player: {
        userProfileId
      },
      game: {
        bggId: game.bggId
      }
    };
  }

  return {
    player: {
      userProfileId
    },
    game: {
      bggId: null,
      title: normalizedTitleFilter(game.title)
    }
  };
}

export async function calculateUserGameRating(
  db: DatabaseClient,
  game: Pick<GameSnapshot, 'userProfileId' | 'bggId' | 'title'>
) {
  const result = await db.rating.aggregate({
    where: userRatingWhere(game.userProfileId, game),
    _avg: {
      score: true
    },
    _count: {
      score: true
    }
  });

  return {
    score: result._avg.score === null ? null : Number(result._avg.score.toFixed(2)),
    ratingCount: result._count.score
  };
}

export async function syncStoredUserGameRating(db: DatabaseClient, game: GameSnapshot) {
  const aggregate = await calculateUserGameRating(db, game);
  const gameKey = userGameRatingKey(game);

  if (aggregate.score === null || aggregate.ratingCount === 0) {
    await db.userGameRating.deleteMany({
      where: {
        userProfileId: game.userProfileId,
        gameKey
      }
    });
    return null;
  }

  return db.userGameRating.upsert({
    where: {
      userProfileId_gameKey: {
        userProfileId: game.userProfileId,
        gameKey
      }
    },
    update: {
      bggId: game.bggId,
      title: game.title,
      yearPublished: game.yearPublished,
      thumbnailUrl: game.thumbnailUrl,
      imageUrl: game.imageUrl,
      score: aggregate.score,
      ratingCount: aggregate.ratingCount
    },
    create: {
      userProfileId: game.userProfileId,
      gameKey,
      bggId: game.bggId,
      title: game.title,
      yearPublished: game.yearPublished,
      thumbnailUrl: game.thumbnailUrl,
      imageUrl: game.imageUrl,
      score: aggregate.score,
      ratingCount: aggregate.ratingCount
    }
  });
}

export async function syncStoredUserGameRatingsForPlayer(
  db: DatabaseClient,
  playerId: string,
  userProfileId: string
) {
  const ratings = await db.rating.findMany({
    where: { playerId },
    include: {
      game: {
        select: {
          bggId: true,
          title: true,
          yearPublished: true,
          thumbnailUrl: true,
          imageUrl: true
        }
      }
    }
  });

  for (const rating of ratings) {
    await syncStoredUserGameRating(db, {
      userProfileId,
      bggId: rating.game.bggId,
      title: rating.game.title,
      yearPublished: rating.game.yearPublished,
      thumbnailUrl: rating.game.thumbnailUrl,
      imageUrl: rating.game.imageUrl
    });
  }
}
