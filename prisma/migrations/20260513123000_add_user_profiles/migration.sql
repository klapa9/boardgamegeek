-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "userProfileId" TEXT;

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");

-- CreateIndex
CREATE INDEX "Player_userProfileId_idx" ON "Player"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_sessionId_userProfileId_key" ON "Player"("sessionId", "userProfileId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
