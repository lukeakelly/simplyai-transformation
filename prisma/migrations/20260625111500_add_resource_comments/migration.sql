CREATE TABLE "ResourceComment" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResourceComment_targetType_targetId_idx" ON "ResourceComment"("targetType", "targetId");
CREATE INDEX "ResourceComment_createdAt_idx" ON "ResourceComment"("createdAt");
