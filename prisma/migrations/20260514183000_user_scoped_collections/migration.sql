-- AlterTable
ALTER TABLE "CollectionGame" ADD COLUMN "userProfileId" TEXT;

-- AlterTable
ALTER TABLE "CollectionGroup" ADD COLUMN "userProfileId" TEXT;

-- AlterTable
ALTER TABLE "CollectionSyncState" ADD COLUMN "userProfileId" TEXT;
ALTER TABLE "CollectionSyncState" ALTER COLUMN "id" DROP DEFAULT;

-- DropIndex
DROP INDEX "CollectionGame_bggId_key";

-- CreateIndex
CREATE INDEX "CollectionGame_userProfileId_idx" ON "CollectionGame"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionGame_userProfileId_bggId_key" ON "CollectionGame"("userProfileId", "bggId");

-- CreateIndex
CREATE INDEX "CollectionGroup_userProfileId_idx" ON "CollectionGroup"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionGroup_userProfileId_name_key" ON "CollectionGroup"("userProfileId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionSyncState_userProfileId_key" ON "CollectionSyncState"("userProfileId");

-- AddForeignKey
ALTER TABLE "CollectionGame"
ADD CONSTRAINT "CollectionGame_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionGroup"
ADD CONSTRAINT "CollectionGroup_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSyncState"
ADD CONSTRAINT "CollectionSyncState_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
