-- Additief: geheime gastsleutel (alleen de SHA-256-hash) per gastspeler.
-- Bestaande rijen krijgen NULL; er wordt niets verwijderd of gewijzigd.
-- Rollback: ALTER TABLE "Player" DROP COLUMN "guestTokenHash";
ALTER TABLE "Player" ADD COLUMN "guestTokenHash" TEXT;

CREATE INDEX "Player_sessionId_guestTokenHash_idx" ON "Player"("sessionId", "guestTokenHash");
