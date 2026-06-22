import functionalDemoSnapshotJson from "../fixtures/mlvizz/v1/functional-demo/snapshot.json";
import type { MLVizzSnapshot } from "../src/integrations/mlvizz/contracts";
import { ApiMLVizzProvider } from "../src/integrations/mlvizz/api-provider";
import { FileMLVizzProvider } from "../src/integrations/mlvizz/file-provider";
import { MockMLVizzProvider } from "../src/integrations/mlvizz/mock-provider";
import { validateMLVizzSnapshot } from "../src/integrations/mlvizz/validation";
import { buildMLVizzSyncPlan } from "../src/integrations/mlvizz/sync-service";

const packs = ["nominal-small", "functional-demo", "edge-cases"] as const;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function snapshotShape(snapshot: MLVizzSnapshot) {
  return {
    people: snapshot.people.map((item) => item.canonicalPersonId),
    clients: snapshot.clients.map((item) => item.canonicalClientId),
    opportunities: snapshot.opportunities.map((item) => item.canonicalOpportunityId),
    projects: snapshot.projects.map((item) => item.canonicalProjectId),
    requests: snapshot.resourceRequests.map((item) => item.canonicalRequestId),
    allocations: snapshot.plannedAllocations.map((item) => item.canonicalAllocationId),
    timesheets: snapshot.timesheetActuals.map((item) => item.canonicalTimesheetEntryId),
    financials: snapshot.financialActuals.map((item) => item.canonicalFinancialTransactionId),
  };
}

async function main() {
  const mockProvider = new MockMLVizzProvider();
  const fileProvider = new FileMLVizzProvider();

  for (const packId of packs) {
    const mockSnapshot = await mockProvider.getSnapshot({ packId });
    const fileSnapshot = await fileProvider.getSnapshot({ packId });
    assert(validateMLVizzSnapshot(mockSnapshot).valid, `${packId} mock snapshot should validate`);
    assert(validateMLVizzSnapshot(fileSnapshot).valid, `${packId} file snapshot should validate`);
    assert(JSON.stringify(snapshotShape(mockSnapshot)) === JSON.stringify(snapshotShape(fileSnapshot)), `${packId} provider canonical IDs should match`);
  }

  const apiProvider = new ApiMLVizzProvider({
    baseUrl: "https://mlvizz.example.invalid",
    fetchImplementation: async () => new Response(JSON.stringify(functionalDemoSnapshotJson), { status: 200, headers: { "Content-Type": "application/json" } }),
  });
  const apiSnapshot = await apiProvider.getSnapshot({ packId: "functional-demo", correlationId: "contract-test" });
  assert(JSON.stringify(snapshotShape(apiSnapshot)) === JSON.stringify(snapshotShape(functionalDemoSnapshotJson as MLVizzSnapshot)), "API provider should return the same canonical object shape");

  const firstPlan = await buildMLVizzSyncPlan(fileProvider, { correlationId: "sync-test-1", lastSnapshotId: null, startedAt: new Date(0).toISOString() });
  const secondPlan = await buildMLVizzSyncPlan(fileProvider, { correlationId: "sync-test-2", lastSnapshotId: null, startedAt: new Date(0).toISOString() });
  assert(firstPlan.acceptedRecords === secondPlan.acceptedRecords, "Rerunning the same input should produce an idempotent accepted count");
  assert(firstPlan.rejectedRecords === secondPlan.rejectedRecords, "Rerunning the same input should produce an idempotent rejected count");

  console.log("MLVizz provider contract tests passed");
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
