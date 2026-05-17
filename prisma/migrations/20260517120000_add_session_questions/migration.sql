CREATE TABLE "SessionQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "chosenOptionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SessionQuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionQuestionOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SessionQuestionAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionQuestionAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionQuestion_sessionId_idx" ON "SessionQuestion"("sessionId");
CREATE INDEX "SessionQuestionOption_questionId_idx" ON "SessionQuestionOption"("questionId");
CREATE INDEX "SessionQuestionAnswer_questionId_idx" ON "SessionQuestionAnswer"("questionId");
CREATE INDEX "SessionQuestionAnswer_playerId_idx" ON "SessionQuestionAnswer"("playerId");
CREATE UNIQUE INDEX "SessionQuestionAnswer_questionId_optionId_playerId_key" ON "SessionQuestionAnswer"("questionId", "optionId", "playerId");

ALTER TABLE "SessionQuestion" ADD CONSTRAINT "SessionQuestion_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionQuestion" ADD CONSTRAINT "SessionQuestion_chosenOptionId_fkey"
FOREIGN KEY ("chosenOptionId") REFERENCES "SessionQuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SessionQuestionOption" ADD CONSTRAINT "SessionQuestionOption_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "SessionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionQuestionAnswer" ADD CONSTRAINT "SessionQuestionAnswer_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "SessionQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionQuestionAnswer" ADD CONSTRAINT "SessionQuestionAnswer_optionId_fkey"
FOREIGN KEY ("optionId") REFERENCES "SessionQuestionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionQuestionAnswer" ADD CONSTRAINT "SessionQuestionAnswer_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
