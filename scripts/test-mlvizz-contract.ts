import functionalDemoSnapshotJson from "../fixtures/mlvizz/v1/functional-demo/snapshot.json";
import type { MLVizzSnapshot } from "../src/integrations/mlvizz/contracts";
import { ApiMLVizzProvider } from "../src/integrations/mlvizz/api-provider";
import { FileMLVizzProvider } from "../src/integrations/mlvizz/file-provider";
import { MockMLVizzProvider } from "../src/integrations/mlvizz/mock-provider";
import { validateMLVizzSnapshot } from "../src/integrations/mlvizz/validation";
import { buildMLVizzSyncPlan } from "../src/integrations/mlvizz/sync-service";
import { buildResourceDashboardKpis } from "../src/lib/resource-command-kpis";
import { TODAY, financialActuals, resourceAssignments, resourceDemands, resourcePeople, timesheetActuals } from "../src/lib/resource-command-data";

const packs = ["nominal-small", "functional-demo", "edge-cases"] as const;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message}: expected ${String(expected)}, got ${String(actual)}`);
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

  const next30Kpis = buildResourceDashboardKpis({
    today: TODAY,
    people: resourcePeople,
    assignments: resourceAssignments,
    demands: resourceDemands,
    timesheetActuals,
    financialActuals,
    windowBusinessDays: 30,
  });
  assertEqual(next30Kpis.availableHours, 2868, "30-day available hours should be normalized from daily capacity minus leave");
  assertEqual(next30Kpis.utilisationPct, 22, "30-day utilisation should be committed billable/managed-service hours divided by available hours");
  assertEqual(next30Kpis.tentativePct, 4, "30-day tentative utilisation should be tracked separately");
  assertEqual(next30Kpis.pipelineWeightedPersonDays, 67.3, "Pipeline demand should be confidence-weighted FTE-days");
  assertEqual(next30Kpis.pipelineCapacityPct, 19, "Pipeline demand should be capacity-relative");
  assertEqual(next30Kpis.overAllocatedHours, 80, "Over-allocation should be excess hours, not raw percent totals");
  assertEqual(next30Kpis.overAllocatedPersonDays, 10, "Over-allocation should retain person-day exception count");
  assertEqual(next30Kpis.benchPersonDays, 201, "Bench capacity should be remaining person-days after scheduled work and leave");
  assertEqual(next30Kpis.submittedTimesheetHours, 48, "Submitted timesheets should remain separate from planned allocation KPIs");
  assertEqual(next30Kpis.approvedTimesheetHours, 38.4, "Approved timesheets should remain separate from planned allocation KPIs");
  assertEqual(next30Kpis.invoicedRevenue, 184000, "Invoiced actuals should come from financial actuals");
  assertEqual(next30Kpis.paidRevenue, 60000, "Paid actuals should come from financial actuals");

  console.log("MLVizz provider contract tests passed");
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
