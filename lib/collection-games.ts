import { Prisma } from '@prisma/client';

export const collectionGameInclude = {
  mechanics: {
    include: {
      mechanic: true
    }
  },
  categories: {
    include: {
      category: true
    }
  }
} satisfies Prisma.CollectionGameInclude;

export type CollectionGameWithRelations = Prisma.CollectionGameGetPayload<{
  include: typeof collectionGameInclude;
}>;

export function collectionGameMechanicNames(game: CollectionGameWithRelations) {
  return game.mechanics
    .map((entry) => entry.mechanic.name)
    .sort((left, right) => left.localeCompare(right));
}

export function collectionGameCategoryNames(game: CollectionGameWithRelations) {
  return game.categories
    .map((entry) => entry.category.name)
    .sort((left, right) => left.localeCompare(right));
}

export function collectionGameToSessionGameData(game: CollectionGameWithRelations) {
  const playerCountPoll = game.playerCountPoll === null ? Prisma.JsonNull : game.playerCountPoll as Prisma.InputJsonValue;
  const ranks = game.ranks === null ? Prisma.JsonNull : game.ranks as Prisma.InputJsonValue;

  return {
    title: game.title,
    bggId: game.bggId,
    yearPublished: game.yearPublished,
    thumbnailUrl: game.thumbnailUrl,
    imageUrl: game.imageUrl,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    playingTime: game.playingTime,
    minAge: game.minAge,
    bggRating: game.bggRating,
    bggBayesRating: game.bggBayesRating,
    bggWeight: game.bggWeight,
    mechanics: collectionGameMechanicNames(game),
    categories: collectionGameCategoryNames(game),
    designers: [...game.designers].sort((left, right) => left.localeCompare(right)),
    playMode: game.playMode,
    communityPlayers: [...game.communityPlayers].sort((left, right) => left - right),
    playerCountPoll,
    ranks,
    lastSyncedAt: game.lastSyncedAt
  };
}

