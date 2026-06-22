import type { Prisma } from "@prisma/client";
import type { MLVizzProvider } from "./provider";

export type MLVizzSyncCheckpoint = {
  correlationId: string;
  lastSnapshotId: string | null;
  startedAt: string;
};

export type MLVizzSyncPlan = {
  correlationId: string;
  acceptedRecords: number;
  rejectedRecords: number;
  refreshRuns: Prisma.InputJsonObject[];
  failedRecords: Prisma.InputJsonObject[];
};

export async function buildMLVizzSyncPlan(provider: MLVizzProvider, checkpoint: MLVizzSyncCheckpoint): Promise<MLVizzSyncPlan> {
  const snapshot = await provider.getSnapshot({ correlationId: checkpoint.correlationId });
  return {
    correlationId: checkpoint.correlationId,
    acceptedRecords:
      snapshot.people.length +
      snapshot.leaveEvents.length +
      snapshot.clients.length +
      snapshot.opportunities.length +
      snapshot.projects.length +
      snapshot.resourceRequests.length +
      snapshot.plannedAllocations.length +
      snapshot.timesheetActuals.length +
      snapshot.financialActuals.length,
    rejectedRecords: snapshot.failedRecords.length,
    refreshRuns: snapshot.refreshRuns.map((run) => ({ ...run })),
    failedRecords: snapshot.failedRecords.map((record) => ({ ...record })),
  };
}
