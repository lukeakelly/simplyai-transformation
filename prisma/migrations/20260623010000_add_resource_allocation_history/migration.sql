-- CreateTable
CREATE TABLE "ResourceAllocationHistory" (
    "id" TEXT NOT NULL,
    "canonicalAllocationId" TEXT NOT NULL,
    "canonicalPersonId" TEXT,
    "canonicalProjectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforePayload" JSONB NOT NULL,
    "afterPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAllocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceAllocationHistory_canonicalAllocationId_idx" ON "ResourceAllocationHistory"("canonicalAllocationId");

-- CreateIndex
CREATE INDEX "ResourceAllocationHistory_canonicalPersonId_idx" ON "ResourceAllocationHistory"("canonicalPersonId");

-- CreateIndex
CREATE INDEX "ResourceAllocationHistory_canonicalProjectId_idx" ON "ResourceAllocationHistory"("canonicalProjectId");

-- CreateIndex
CREATE INDEX "ResourceAllocationHistory_createdAt_idx" ON "ResourceAllocationHistory"("createdAt");
