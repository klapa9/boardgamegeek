-- AlterTable
ALTER TABLE "CollectionGame" ADD COLUMN "websiteRating" DOUBLE PRECISION;

-- Backfill from previously saved session ratings for games with a BGG id.
UPDATE "CollectionGame" AS cg
SET "websiteRating" = source.avg_score
FROM (
  SELECT g."bggId" AS bgg_id, AVG(r."score")::DOUBLE PRECISION AS avg_score
  FROM "Rating" AS r
  INNER JOIN "Game" AS g ON g."id" = r."gameId"
  WHERE g."bggId" IS NOT NULL
  GROUP BY g."bggId"
) AS source
WHERE cg."bggId" IS NOT NULL
  AND cg."bggId" = source.bgg_id;

-- Backfill manual games without a BGG id by matching on title.
UPDATE "CollectionGame" AS cg
SET "websiteRating" = source.avg_score
FROM (
  SELECT LOWER(g."title") AS normalized_title, AVG(r."score")::DOUBLE PRECISION AS avg_score
  FROM "Rating" AS r
  INNER JOIN "Game" AS g ON g."id" = r."gameId"
  WHERE g."bggId" IS NULL
  GROUP BY LOWER(g."title")
) AS source
WHERE cg."bggId" IS NULL
  AND LOWER(cg."title") = source.normalized_title;
