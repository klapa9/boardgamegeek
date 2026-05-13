import { Prisma } from '@prisma/client';
import { collectionGameInclude } from '@/lib/collection-games';

export const collectionGroupInclude = {
  games: {
    include: {
      collectionGame: {
        include: collectionGameInclude
      }
    }
  }
} satisfies Prisma.CollectionGroupInclude;

export type CollectionGroupWithRelations = Prisma.CollectionGroupGetPayload<{
  include: typeof collectionGroupInclude;
}>;
