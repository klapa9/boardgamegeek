ALTER TABLE "Session"
ADD COLUMN "organizerUserProfileId" TEXT;

CREATE INDEX "Session_organizerUserProfileId_idx" ON "Session"("organizerUserProfileId");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_organizerUserProfileId_fkey"
FOREIGN KEY ("organizerUserProfileId") REFERENCES "UserProfile"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
