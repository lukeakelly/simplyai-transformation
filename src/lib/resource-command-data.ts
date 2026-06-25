import { MockMLVizzProvider } from "@/integrations/mlvizz/mock-provider";
import type {
  MLVizzDatasetName,
  MLVizzFinancialActual,
  MLVizzIdentityMapping,
  MLVizzPlannedAllocation,
  MLVizzReconciliationSummary,
  MLVizzRefreshRun,
  MLVizzSnapshot,
  MLVizzTimesheetActual,
} from "@/integrations/mlvizz/contracts";

export type AssignmentStatus = "Confirmed" | "Tentative" | "Requested" | "Waiting List" | "At Risk";
export type AssignmentType = "Billable" | "Managed Service" | "Presales" | "Business Development" | "Internal" | "Training" | "Leave" | "Bench";
export type DemandStatus = "Qualified" | "Proposed" | "Committed" | "Waiting List" | "Expired";
export type MigrationSeverity = "Critical" | "Warning" | "Info";

export type ResourcePerson = {
  id: string;
  employeeNo: string;
  name: string;
  role: string;
  level: string;
  pillar: string;
  manager: string;
  location: string;
  employmentType: string;
  dailyCapacityHours: number;
  skills: string[];
  certifications: string[];
  billRate: number;
  costRate: number;
  tags: string[];
};

export type ResourceProject = {
  id: string;
  client: string;
  name: string;
  code: string;
  pillar: string;
  deliveryLead: string;
  health: "Green" | "Amber" | "Red";
};

export type ResourceDemand = {
  id: string;
  client: string;
  opportunity: string;
  sourceOpportunityId: string;
  role: string;
  level: string;
  requiredSkills: string[];
  start: string;
  end: string;
  allocationPct: number;
  status: DemandStatus;
  stage: string;
  confidence: number;
  priority: "Critical" | "High" | "Medium";
  location: string;
  pillar: string;
  expiryDate: string;
  rate: number;
  notes: string;
};

export type ResourceAssignment = {
  id: string;
  personId: string | null;
  projectId: string;
  type: AssignmentType;
  status: AssignmentStatus;
  role: string;
  start: string;
  end: string;
  allocationPct: number;
  confidence: number;
  source: string;
  notes: string;
  override?: {
    reason: string;
    approver: string;
    expiryDate: string;
  };
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  record: string;
  summary: string;
  at: string;
};

export type ResourceAllocationHistoryEntry = {
  id: string;
  assignmentId: string;
  personId: string | null;
  projectId: string;
  action: string;
  actor: string;
  at: string;
  summary: string;
  before?: ResourceAssignment | null;
  after?: ResourceAssignment | null;
};

export type MigrationIssue = {
  id: string;
  severity: MigrationSeverity;
  area: string;
  record: string;
  issue: string;
  proposedResolution: string;
  status: "Open" | "Mapped" | "Accepted";
};

export type ResourceFreshness = {
  datasetName: MLVizzDatasetName;
  sourceSystem: string;
  status: string;
  dataQualityStatus: string;
  mlvizzPublishedAt: string;
  lastSuccessfulRefreshAt: string;
  failureSummary: string | null;
  recordsAccepted: number;
  recordsRejected: number;
};

const provider = new MockMLVizzProvider();
export const mlvizzSnapshot: MLVizzSnapshot = provider.getSnapshotSync({ packId: "functional-demo" });
export const TODAY = mlvizzSnapshot.metadata.businessEffectiveDate;

function findClientName(canonicalClientId: string) {
  return mlvizzSnapshot.clients.find((client) => client.canonicalClientId === canonicalClientId)?.clientName ?? "Unknown client";
}

function findPersonName(canonicalPersonId: string | null) {
  if (!canonicalPersonId) return "Unassigned";
  return mlvizzSnapshot.people.find((person) => person.canonicalPersonId === canonicalPersonId)?.displayName ?? "Unknown person";
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

const statusMap: Record<MLVizzPlannedAllocation["status"], AssignmentStatus> = {
  planned: "Confirmed",
  tentative: "Tentative",
  requested: "Requested",
  waiting_list: "Waiting List",
  at_risk: "At Risk",
};

const typeMap: Record<MLVizzPlannedAllocation["allocationType"], AssignmentType> = {
  billable: "Billable",
  "managed-service": "Managed Service",
  presales: "Presales",
  "business-development": "Business Development",
  internal: "Internal",
  training: "Training",
  leave: "Leave",
  bench: "Bench",
};

export const resourcePeople: ResourcePerson[] = mlvizzSnapshot.people.map((person) => ({
  id: person.canonicalPersonId,
  employeeNo: person.employmentHeroEmployeeId,
  name: person.displayName,
  role: person.role,
  level: person.grade,
  pillar: person.homePillar,
  manager: findPersonName(person.managerCanonicalPersonId),
  location: person.location,
  employmentType: person.employmentType,
  dailyCapacityHours: person.standardHoursPerDay,
  skills: person.skills,
  certifications: person.certifications,
  billRate: person.billRate,
  costRate: person.costRate,
  tags: [person.employmentStatus, person.lineage.sourceSystem, person.inactive ? "inactive" : "active"],
}));

export const resourceProjects: ResourceProject[] = mlvizzSnapshot.projects.map((project) => ({
  id: project.canonicalProjectId,
  client: findClientName(project.canonicalClientId),
  name: project.projectName,
  code: project.projectCode,
  pillar: project.pillar,
  deliveryLead: findPersonName(project.deliveryLeadCanonicalPersonId),
  health: titleCase(project.health) as ResourceProject["health"],
}));

export const resourceAssignments: ResourceAssignment[] = mlvizzSnapshot.plannedAllocations.map((allocation) => ({
  id: allocation.canonicalAllocationId,
  personId: allocation.canonicalPersonId,
  projectId: allocation.canonicalProjectId,
  type: typeMap[allocation.allocationType],
  status: statusMap[allocation.status],
  role: allocation.role,
  start: allocation.startDate,
  end: allocation.endDate,
  allocationPct: allocation.allocationPct,
  confidence: allocation.confidencePct,
  source: allocation.source,
  notes: allocation.notes,
}));

export const resourceAllocationHistory: ResourceAllocationHistoryEntry[] = resourceAssignments.map((assignment) => ({
  id: `hist-${assignment.id}-mlvizz`,
  assignmentId: assignment.id,
  personId: assignment.personId,
  projectId: assignment.projectId,
  action: "Imported allocation",
  actor: "MLVizz Sync",
  at: mlvizzSnapshot.metadata.applicationIngestedAt,
  summary: `${assignment.status} ${assignment.allocationPct}% ${assignment.role} imported from ${assignment.source} for ${assignment.start} to ${assignment.end}.`,
  before: null,
  after: assignment,
}));

export const resourceDemands: ResourceDemand[] = mlvizzSnapshot.resourceRequests.map((request) => {
  const opportunity = mlvizzSnapshot.opportunities.find((item) => item.canonicalOpportunityId === request.canonicalOpportunityId);
  const clientName = opportunity ? findClientName(opportunity.canonicalClientId) : "Unknown client";
  const requestStatus: Record<typeof request.status, DemandStatus> = {
    open: "Qualified",
    matched: "Proposed",
    waiting_list: "Waiting List",
    closed: "Committed",
  };
  const priority: Record<NonNullable<typeof opportunity>["priority"], ResourceDemand["priority"]> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
  };
  return {
    id: request.canonicalRequestId,
    client: clientName,
    opportunity: opportunity?.opportunityName ?? request.requestedRole,
    sourceOpportunityId: opportunity?.hubspotDealId ?? "not-yet-mapped",
    role: request.requestedRole,
    level: request.requestedGrade,
    requiredSkills: request.requiredSkills,
    start: request.startDate,
    end: request.endDate,
    allocationPct: request.allocationPct,
    status: requestStatus[request.status],
    stage: opportunity ? titleCase(opportunity.dealStage) : "Resource App Request",
    confidence: opportunity?.probabilityPct ?? 100,
    priority: opportunity ? priority[opportunity.priority] : "Medium",
    location: opportunity?.location ?? "Flexible",
    pillar: opportunity?.pillar ?? "Unassigned",
    expiryDate: opportunity?.expiresAt ?? request.endDate,
    rate: Math.round(resourcePeople.reduce((total, person) => total + person.billRate, 0) / Math.max(1, resourcePeople.length)),
    notes: "Demand from canonical MLVizz opportunity/request data.",
  };
});

export const mlvizzFreshness: ResourceFreshness[] = mlvizzSnapshot.refreshRuns.map((run) => ({
  datasetName: run.datasetName,
  sourceSystem: run.sourceSystem,
  status: run.status,
  dataQualityStatus: run.dataQualityStatus,
  mlvizzPublishedAt: run.mlvizzPublishedAt,
  lastSuccessfulRefreshAt: run.lastSuccessfulRefreshAt,
  failureSummary: run.failureSummary,
  recordsAccepted: run.recordsAccepted,
  recordsRejected: run.recordsRejected,
}));

export const timesheetActuals: MLVizzTimesheetActual[] = mlvizzSnapshot.timesheetActuals;
export const financialActuals: MLVizzFinancialActual[] = mlvizzSnapshot.financialActuals;
export const identityMappings: MLVizzIdentityMapping[] = mlvizzSnapshot.identityMappings;
export const reconciliationSummaries: MLVizzReconciliationSummary[] = mlvizzSnapshot.reconciliation;
export const refreshRuns: MLVizzRefreshRun[] = mlvizzSnapshot.refreshRuns;

export const migrationIssues: MigrationIssue[] = [
  ...mlvizzSnapshot.failedRecords.map((record): MigrationIssue => ({
    id: record.failedRecordId,
    severity: "Critical",
    area: `${record.sourceSystem} ${record.datasetName}`,
    record: record.sourceRecordId,
    issue: record.failureReason,
    proposedResolution: "Keep the record quarantined, retain last-known-good data and reprocess after mapping correction.",
    status: record.reprocessStatus === "reprocessed" ? "Accepted" : "Open",
  })),
  ...mlvizzSnapshot.reconciliation
    .filter((item) => item.status !== "matched")
    .map((item): MigrationIssue => ({
      id: item.reconciliationId,
      severity: item.status === "failed" ? "Critical" : "Warning",
      area: `${item.sourceSystem} ${item.datasetName}`,
      record: item.reconciliationId,
      issue: item.notes,
      proposedResolution: "Review source counts, canonical mappings and quarantine before promoting the refresh.",
      status: "Open",
    })),
  {
    id: "decision-mlvizz-auth",
    severity: "Info",
    area: "Open integration decision",
    record: "MLVizz authentication",
    issue: "Production MLVizz authentication mechanism is not confirmed yet.",
    proposedResolution: "Configure ApiMLVizzProvider with the agreed auth method when the development endpoint is supplied.",
    status: "Open",
  },
  {
    id: "decision-outbound",
    severity: "Info",
    area: "Open integration decision",
    record: "Outbound planning interface",
    issue: "Final write/publish mechanism for app-owned planning data is still to be confirmed.",
    proposedResolution: "Keep publishing behind MLVizzOutboundPublisher so write API, pull API, event feed or scheduled extract can be swapped without UI changes.",
    status: "Open",
  },
];

export const auditEntries: AuditEntry[] = [
  {
    id: "aud-mlvizz-ingest",
    actor: "MLVizz Sync",
    action: "Ingested canonical data",
    record: mlvizzSnapshot.metadata.packId,
    summary: `Loaded ${mlvizzSnapshot.metadata.schemaVersion} using MockMLVizzProvider with ${mlvizzSnapshot.people.length} people, ${mlvizzSnapshot.projects.length} projects and ${mlvizzSnapshot.resourceRequests.length} requests.`,
    at: mlvizzSnapshot.metadata.applicationIngestedAt,
  },
  {
    id: "aud-lkg",
    actor: "MLVizz Sync",
    action: "Retained last-known-good",
    record: mlvizzSnapshot.metadata.lastKnownGoodSnapshotId,
    summary: "Failed refreshes do not erase valid planning data or block schedule edits.",
    at: mlvizzSnapshot.metadata.applicationIngestedAt,
  },
];

export function money(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
}

export function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function businessDays(start: string, count: number) {
  const days: string[] = [];
  let cursor = start;
  while (days.length < count) {
    const weekday = new Date(`${cursor}T00:00:00.000Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00.000Z`));
}

export function overlaps(day: string, assignment: ResourceAssignment) {
  return day >= assignment.start && day <= assignment.end;
}

export function assignmentProject(assignment: ResourceAssignment) {
  return resourceProjects.find((project) => project.id === assignment.projectId) ?? resourceProjects[0];
}
