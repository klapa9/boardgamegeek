CREATE TABLE "FeedbackRequest" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "normalizedMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedbackRequest_userProfileId_createdAt_idx" ON "FeedbackRequest"("userProfileId", "createdAt");
CREATE INDEX "FeedbackRequest_createdAt_idx" ON "FeedbackRequest"("createdAt");
CREATE INDEX "FeedbackRequest_normalizedMessage_idx" ON "FeedbackRequest"("normalizedMessage");

ALTER TABLE "FeedbackRequest" ADD CONSTRAINT "FeedbackRequest_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
