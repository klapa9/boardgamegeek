-- CreateTable
CREATE TABLE "UserGameRating" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "bggId" INTEGER,
    "title" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "thumbnailUrl" TEXT,
    "imageUrl" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "ratingCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGameRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGameRating_userProfileId_gameKey_key" ON "UserGameRating"("userProfileId", "gameKey");

-- CreateIndex
CREATE INDEX "UserGameRating_userProfileId_score_idx" ON "UserGameRating"("userProfileId", "score");

-- CreateIndex
CREATE INDEX "UserGameRating_bggId_idx" ON "UserGameRating"("bggId");

-- AddForeignKey
ALTER TABLE "UserGameRating" ADD CONSTRAINT "UserGameRating_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing ratings for signed-in users as personal aggregate scores.
INSERT INTO "UserGameRating" (
    "id",
    "userProfileId",
    "gameKey",
    "bggId",
    "title",
    "yearPublished",
    "thumbnailUrl",
    "imageUrl",
    "score",
    "ratingCount",
    "updatedAt"
)
SELECT
    'ugr-' || md5(CONCAT_WS('|', source."userProfileId", source."gameKey")),
    source."userProfileId",
    source."gameKey",
    source."bggId",
    source."title",
    source."yearPublished",
    source."thumbnailUrl",
    source."imageUrl",
    source."score",
    source."ratingCount",
    CURRENT_TIMESTAMP
FROM (
    SELECT
        p."userProfileId" AS "userProfileId",
        'bgg:' || g."bggId"::TEXT AS "gameKey",
        g."bggId" AS "bggId",
        MAX(g."title") AS "title",
        MAX(g."yearPublished") AS "yearPublished",
        MAX(g."thumbnailUrl") AS "thumbnailUrl",
        MAX(g."imageUrl") AS "imageUrl",
        AVG(r."score")::DOUBLE PRECISION AS "score",
        COUNT(*)::INTEGER AS "ratingCount"
    FROM "Rating" AS r
    INNER JOIN "Player" AS p ON p."id" = r."playerId"
    INNER JOIN "Game" AS g ON g."id" = r."gameId"
    WHERE p."userProfileId" IS NOT NULL
      AND g."bggId" IS NOT NULL
    GROUP BY p."userProfileId", g."bggId"

    UNION ALL

    SELECT
        p."userProfileId" AS "userProfileId",
        'title:' || LOWER(TRIM(g."title")) AS "gameKey",
        NULL AS "bggId",
        MAX(g."title") AS "title",
        MAX(g."yearPublished") AS "yearPublished",
        MAX(g."thumbnailUrl") AS "thumbnailUrl",
        MAX(g."imageUrl") AS "imageUrl",
        AVG(r."score")::DOUBLE PRECISION AS "score",
        COUNT(*)::INTEGER AS "ratingCount"
    FROM "Rating" AS r
    INNER JOIN "Player" AS p ON p."id" = r."playerId"
    INNER JOIN "Game" AS g ON g."id" = r."gameId"
    WHERE p."userProfileId" IS NOT NULL
      AND g."bggId" IS NULL
    GROUP BY p."userProfileId", LOWER(TRIM(g."title"))
) AS source;
