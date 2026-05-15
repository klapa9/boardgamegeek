-- AlterTable
ALTER TABLE "CollectionGame"
ADD COLUMN "inBggCollection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manuallyAdded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manuallyRemoved" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows so current behavior stays intact after migration.
UPDATE "CollectionGame"
SET "inBggCollection" = CASE WHEN "source" = 'bgg' THEN true ELSE false END,
    "manuallyAdded" = CASE WHEN "source" = 'manual' AND "hidden" = false THEN true ELSE false END,
    "manuallyRemoved" = false;
