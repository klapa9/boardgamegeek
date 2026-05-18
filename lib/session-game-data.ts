import { Prisma } from '@prisma/client';
import { BggThingDetails } from '@/lib/bgg-xml';

export function bggThingDetailsToSessionGameData(game: BggThingDetails) {
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
    mechanics: [...game.mechanics].sort((left, right) => left.localeCompare(right)),
    categories: [...game.categories].sort((left, right) => left.localeCompare(right)),
    designers: [...game.designers].sort((left, right) => left.localeCompare(right)),
    playMode: game.playMode,
    communityPlayers: [...game.communityPlayers].sort((left, right) => left - right),
    playerCountPoll: game.playerCountPoll.length ? game.playerCountPoll as Prisma.InputJsonValue : Prisma.JsonNull,
    ranks: game.ranks.length ? game.ranks as Prisma.InputJsonValue : Prisma.JsonNull,
    lastSyncedAt: new Date()
  };
}
