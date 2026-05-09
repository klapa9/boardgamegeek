-- CreateTable
CREATE TABLE "CollectionGame" (
    "id" TEXT NOT NULL,
    "bggId" INTEGER,
    "title" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "imageUrl" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playingTime" INTEGER,
    "bggRating" DOUBLE PRECISION,
    "bggWeight" DOUBLE PRECISION,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSyncState" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "bggUsername" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectionGame_bggId_key" ON "CollectionGame"("bggId");

-- CreateIndex
CREATE INDEX "CollectionGame_title_idx" ON "CollectionGame"("title");

-- CreateIndex
CREATE INDEX "CollectionGame_hidden_idx" ON "CollectionGame"("hidden");
