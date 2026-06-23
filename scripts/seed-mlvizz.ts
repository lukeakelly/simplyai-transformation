import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { FileMLVizzProvider } from "../src/integrations/mlvizz/file-provider";

async function main() {
  const provider = new FileMLVizzProvider();
  const snapshot = await provider.getSnapshot({ packId: "functional-demo" });
  for (const allocation of snapshot.plannedAllocations) {
    await prisma.resourcePlannedAllocation.upsert({
      where: { canonicalAllocationId: allocation.canonicalAllocationId },
      create: {
        canonicalAllocationId: allocation.canonicalAllocationId,
        canonicalPersonId: allocation.canonicalPersonId,
        canonicalProjectId: allocation.canonicalProjectId,
        canonicalRequestId: allocation.canonicalRequestId,
        status: allocation.status,
        allocationType: allocation.allocationType,
        role: allocation.role,
        startDate: new Date(`${allocation.startDate}T00:00:00.000Z`),
        endDate: new Date(`${allocation.endDate}T00:00:00.000Z`),
        allocationPct: allocation.allocationPct,
        confidencePct: allocation.confidencePct,
        payload: allocation as unknown as Prisma.InputJsonObject,
      },
      update: {
        canonicalPersonId: allocation.canonicalPersonId,
        canonicalProjectId: allocation.canonicalProjectId,
        canonicalRequestId: allocation.canonicalRequestId,
        status: allocation.status,
        allocationType: allocation.allocationType,
        role: allocation.role,
        startDate: new Date(`${allocation.startDate}T00:00:00.000Z`),
        endDate: new Date(`${allocation.endDate}T00:00:00.000Z`),
        allocationPct: allocation.allocationPct,
        confidencePct: allocation.confidencePct,
        payload: allocation as unknown as Prisma.InputJsonObject,
      },
    });
  }
  for (const run of snapshot.refreshRuns) {
    await prisma.resourceSyncRun.upsert({
      where: { refreshRunId: run.refreshRunId },
      create: {
        refreshRunId: run.refreshRunId,
        datasetName: run.datasetName,
        sourceSystem: run.sourceSystem,
        status: run.status,
        dataQualityStatus: run.dataQualityStatus,
        recordsRead: run.recordsRead,
        recordsAccepted: run.recordsAccepted,
        recordsRejected: run.recordsRejected,
        lastSuccessfulAt: new Date(run.lastSuccessfulRefreshAt),
        mlvizzPublishedAt: new Date(run.mlvizzPublishedAt),
        failureSummary: run.failureSummary,
        rawPayload: run as unknown as Prisma.InputJsonObject,
      },
      update: {
        status: run.status,
        dataQualityStatus: run.dataQualityStatus,
        recordsRead: run.recordsRead,
        recordsAccepted: run.recordsAccepted,
        recordsRejected: run.recordsRejected,
        lastSuccessfulAt: new Date(run.lastSuccessfulRefreshAt),
        mlvizzPublishedAt: new Date(run.mlvizzPublishedAt),
        failureSummary: run.failureSummary,
        rawPayload: run as unknown as Prisma.InputJsonObject,
      },
    });
  }
  console.log(`Seeded ${snapshot.plannedAllocations.length} MLVizz planning records and ${snapshot.refreshRuns.length} sync runs.`);
}

main().finally(async () => prisma.$disconnect());
