ALTER TABLE "Game"
  ADD COLUMN "thumbnailUrl" TEXT,
  ADD COLUMN "minAge" INTEGER,
  ADD COLUMN "bggBayesRating" DOUBLE PRECISION,
  ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "designers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "playerCountPoll" JSONB,
  ADD COLUMN "ranks" JSONB,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

UPDATE "Game"
SET "thumbnailUrl" = "imageUrl"
WHERE "thumbnailUrl" IS NULL
  AND "imageUrl" IS NOT NULL;

ALTER TABLE "CollectionGame"
  ADD COLUMN "thumbnailUrl" TEXT,
  ADD COLUMN "minAge" INTEGER,
  ADD COLUMN "bggBayesRating" DOUBLE PRECISION,
  ADD COLUMN "designers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "playerCountPoll" JSONB,
  ADD COLUMN "ranks" JSONB,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

UPDATE "CollectionGame"
SET "thumbnailUrl" = "imageUrl"
WHERE "thumbnailUrl" IS NULL
  AND "imageUrl" IS NOT NULL;

UPDATE "CollectionGame" AS cg
SET "lastSyncedAt" = css."lastSyncedAt"
FROM "CollectionSyncState" AS css
WHERE cg."source" = 'bgg'
  AND css."id" = 'default'
  AND cg."lastSyncedAt" IS NULL;

ALTER TABLE "CollectionSyncState"
  ADD COLUMN "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "syncStartedAt" TIMESTAMP(3),
  ADD COLUMN "syncFinishedAt" TIMESTAMP(3),
  ADD COLUMN "totalGames" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processedGames" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Mechanic" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Mechanic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionGameMechanic" (
  "collectionGameId" TEXT NOT NULL,
  "mechanicId" TEXT NOT NULL,

  CONSTRAINT "CollectionGameMechanic_pkey" PRIMARY KEY ("collectionGameId", "mechanicId")
);

CREATE TABLE "CollectionGameCategory" (
  "collectionGameId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,

  CONSTRAINT "CollectionGameCategory_pkey" PRIMARY KEY ("collectionGameId", "categoryId")
);

CREATE UNIQUE INDEX "Mechanic_name_key" ON "Mechanic"("name");
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "CollectionGame_source_idx" ON "CollectionGame"("source");
CREATE INDEX "CollectionGame_lastSyncedAt_idx" ON "CollectionGame"("lastSyncedAt");
CREATE INDEX "CollectionGameMechanic_mechanicId_idx" ON "CollectionGameMechanic"("mechanicId");
CREATE INDEX "CollectionGameCategory_categoryId_idx" ON "CollectionGameCategory"("categoryId");

ALTER TABLE "CollectionGameMechanic"
  ADD CONSTRAINT "CollectionGameMechanic_collectionGameId_fkey"
  FOREIGN KEY ("collectionGameId") REFERENCES "CollectionGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionGameMechanic"
  ADD CONSTRAINT "CollectionGameMechanic_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionGameCategory"
  ADD CONSTRAINT "CollectionGameCategory_collectionGameId_fkey"
  FOREIGN KEY ("collectionGameId") REFERENCES "CollectionGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollectionGameCategory"
  ADD CONSTRAINT "CollectionGameCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Mechanic" ("id", "name")
SELECT CONCAT('mech_', md5(name)), name
FROM (
  SELECT DISTINCT BTRIM(UNNEST("mechanics")) AS name
  FROM "CollectionGame"
) AS names
WHERE name <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "CollectionGameMechanic" ("collectionGameId", "mechanicId")
SELECT cg."id", m."id"
FROM "CollectionGame" AS cg
CROSS JOIN LATERAL UNNEST(cg."mechanics") AS mechanic_name
JOIN "Mechanic" AS m ON m."name" = BTRIM(mechanic_name)
WHERE BTRIM(mechanic_name) <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE "CollectionGame" DROP COLUMN "mechanics";

