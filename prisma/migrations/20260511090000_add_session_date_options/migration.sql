-- CreateTable
CREATE TABLE "SessionDateOption" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionDateOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionDateOption_sessionId_idx" ON "SessionDateOption"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionDateOption_sessionId_date_key" ON "SessionDateOption"("sessionId", "date");

-- AddForeignKey
ALTER TABLE "SessionDateOption" ADD CONSTRAINT "SessionDateOption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
