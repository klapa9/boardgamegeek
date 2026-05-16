ALTER TABLE "Session"
ADD COLUMN "planningMode" TEXT NOT NULL DEFAULT 'vote_dates',
ADD COLUMN "gameSelectionMode" TEXT NOT NULL DEFAULT 'players_pick';

UPDATE "Session"
SET "planningMode" = CASE
  WHEN "locked" = true AND "chosenDay" IS NOT NULL THEN 'fixed_day'
  ELSE 'vote_dates'
END;

UPDATE "Session" AS s
SET "gameSelectionMode" = CASE
  WHEN NOT EXISTS (
    SELECT 1
    FROM "Game" AS g
    WHERE g."sessionId" = s."id"
  ) THEN 'no_preselect'
  WHEN s."chosenGameId" IS NOT NULL AND (
    SELECT COUNT(*)
    FROM "Game" AS g
    WHERE g."sessionId" = s."id"
  ) = 1 THEN 'host_pick'
  ELSE 'players_pick'
END;
