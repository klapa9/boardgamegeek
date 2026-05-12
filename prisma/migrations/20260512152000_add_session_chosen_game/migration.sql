ALTER TABLE "Session"
ADD COLUMN "chosenGameId" TEXT;

UPDATE "Session" AS s
SET "chosenGameId" = g."id"
FROM (
  SELECT MIN("id") AS "id", "sessionId"
  FROM "Game"
  GROUP BY "sessionId"
  HAVING COUNT(*) = 1
) AS g
WHERE s."id" = g."sessionId";

CREATE INDEX "Session_chosenGameId_idx" ON "Session"("chosenGameId");

ALTER TABLE "Session"
ADD CONSTRAINT "Session_chosenGameId_fkey"
FOREIGN KEY ("chosenGameId") REFERENCES "Game"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
