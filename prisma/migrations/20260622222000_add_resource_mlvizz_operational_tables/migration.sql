-- CreateTable
CREATE TABLE "ResourcePlannedAllocation" (
    "id" TEXT NOT NULL,
    "canonicalAllocationId" TEXT NOT NULL,
    "canonicalPersonId" TEXT,
    "canonicalProjectId" TEXT NOT NULL,
    "canonicalRequestId" TEXT,
    "status" TEXT NOT NULL,
    "allocationType" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "allocationPct" INTEGER NOT NULL,
    "confidencePct" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourcePlannedAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceSyncRun" (
    "id" TEXT NOT NULL,
    "refreshRunId" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dataQualityStatus" TEXT NOT NULL,
    "recordsRead" INTEGER NOT NULL,
    "recordsAccepted" INTEGER NOT NULL,
    "recordsRejected" INTEGER NOT NULL,
    "lastSuccessfulAt" TIMESTAMP(3),
    "mlvizzPublishedAt" TIMESTAMP(3),
    "failureSummary" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceFailedRecord" (
    "id" TEXT NOT NULL,
    "failedRecordId" TEXT NOT NULL,
    "refreshRunId" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "failureReason" TEXT NOT NULL,
    "reprocessStatus" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceFailedRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceOutboundEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "correlationId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceOutboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePlannedAllocation_canonicalAllocationId_key" ON "ResourcePlannedAllocation"("canonicalAllocationId");

-- CreateIndex
CREATE INDEX "ResourcePlannedAllocation_canonicalPersonId_idx" ON "ResourcePlannedAllocation"("canonicalPersonId");

-- CreateIndex
CREATE INDEX "ResourcePlannedAllocation_canonicalProjectId_idx" ON "ResourcePlannedAllocation"("canonicalProjectId");

-- CreateIndex
CREATE INDEX "ResourcePlannedAllocation_status_idx" ON "ResourcePlannedAllocation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceSyncRun_refreshRunId_key" ON "ResourceSyncRun"("refreshRunId");

-- CreateIndex
CREATE INDEX "ResourceSyncRun_datasetName_idx" ON "ResourceSyncRun"("datasetName");

-- CreateIndex
CREATE INDEX "ResourceSyncRun_sourceSystem_idx" ON "ResourceSyncRun"("sourceSystem");

-- CreateIndex
CREATE INDEX "ResourceSyncRun_status_idx" ON "ResourceSyncRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceFailedRecord_failedRecordId_key" ON "ResourceFailedRecord"("failedRecordId");

-- CreateIndex
CREATE INDEX "ResourceFailedRecord_refreshRunId_idx" ON "ResourceFailedRecord"("refreshRunId");

-- CreateIndex
CREATE INDEX "ResourceFailedRecord_datasetName_idx" ON "ResourceFailedRecord"("datasetName");

-- CreateIndex
CREATE INDEX "ResourceFailedRecord_reprocessStatus_idx" ON "ResourceFailedRecord"("reprocessStatus");

-- CreateIndex
CREATE INDEX "ResourceOutboundEvent_eventType_idx" ON "ResourceOutboundEvent"("eventType");

-- CreateIndex
CREATE INDEX "ResourceOutboundEvent_status_idx" ON "ResourceOutboundEvent"("status");

-- CreateIndex
CREATE INDEX "ResourceOutboundEvent_correlationId_idx" ON "ResourceOutboundEvent"("correlationId");
