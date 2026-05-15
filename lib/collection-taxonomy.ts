import { Prisma } from '@prisma/client';
import { BggThingDetails } from '@/lib/bgg-xml';

type TaxonomyMaps = {
  mechanicIdByName: Map<string, string>;
  categoryIdByName: Map<string, string>;
};

type TaxonomySource = Pick<BggThingDetails, 'mechanics' | 'categories'>;

export async function ensureCollectionTaxonomyMaps(
  tx: Prisma.TransactionClient,
  games: TaxonomySource[]
): Promise<TaxonomyMaps> {
  const allMechanics = Array.from(new Set(games.flatMap((game) => game.mechanics))).sort((left, right) => left.localeCompare(right));
  const allCategories = Array.from(new Set(games.flatMap((game) => game.categories))).sort((left, right) => left.localeCompare(right));

  if (allMechanics.length) {
    await tx.mechanic.createMany({
      data: allMechanics.map((name) => ({ name })),
      skipDuplicates: true
    });
  }

  if (allCategories.length) {
    await tx.category.createMany({
      data: allCategories.map((name) => ({ name })),
      skipDuplicates: true
    });
  }

  const [mechanics, categories] = await Promise.all([
    allMechanics.length ? tx.mechanic.findMany({ where: { name: { in: allMechanics } } }) : Promise.resolve([]),
    allCategories.length ? tx.category.findMany({ where: { name: { in: allCategories } } }) : Promise.resolve([])
  ]);

  return {
    mechanicIdByName: new Map(mechanics.map((mechanic) => [mechanic.name, mechanic.id])),
    categoryIdByName: new Map(categories.map((category) => [category.name, category.id]))
  };
}

export async function replaceCollectionGameTaxonomy(
  tx: Prisma.TransactionClient,
  collectionGameId: string,
  game: TaxonomySource,
  maps: TaxonomyMaps
) {
  await tx.collectionGameMechanic.deleteMany({ where: { collectionGameId } });
  if (game.mechanics.length) {
    await tx.collectionGameMechanic.createMany({
      data: game.mechanics
        .map((name) => maps.mechanicIdByName.get(name))
        .filter((id): id is string => Boolean(id))
        .map((mechanicId) => ({ collectionGameId, mechanicId })),
      skipDuplicates: true
    });
  }

  await tx.collectionGameCategory.deleteMany({ where: { collectionGameId } });
  if (game.categories.length) {
    await tx.collectionGameCategory.createMany({
      data: game.categories
        .map((name) => maps.categoryIdByName.get(name))
        .filter((id): id is string => Boolean(id))
        .map((categoryId) => ({ collectionGameId, categoryId })),
      skipDuplicates: true
    });
  }
}
