-- CreateTable
CREATE TABLE "CollectionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionGroupGame" (
    "groupId" TEXT NOT NULL,
    "collectionGameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionGroupGame_pkey" PRIMARY KEY ("groupId","collectionGameId")
);

-- CreateIndex
CREATE INDEX "CollectionGroup_name_idx" ON "CollectionGroup"("name");

-- CreateIndex
CREATE INDEX "CollectionGroupGame_collectionGameId_idx" ON "CollectionGroupGame"("collectionGameId");

-- AddForeignKey
ALTER TABLE "CollectionGroupGame"
ADD CONSTRAINT "CollectionGroupGame_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "CollectionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionGroupGame"
ADD CONSTRAINT "CollectionGroupGame_collectionGameId_fkey"
FOREIGN KEY ("collectionGameId") REFERENCES "CollectionGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
