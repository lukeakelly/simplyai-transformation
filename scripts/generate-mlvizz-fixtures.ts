import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MLVIZZ_RESOURCE_SCHEMA_VERSION,
  type MLVizzClient,
  type MLVizzFinancialActual,
  type MLVizzIdentityMapping,
  type MLVizzLeaveEvent,
  type MLVizzLineage,
  type MLVizzOpportunity,
  type MLVizzPerson,
  type MLVizzPlannedAllocation,
  type MLVizzProject,
  type MLVizzReconciliationSummary,
  type MLVizzRefreshRun,
  type MLVizzResourceRequest,
  type MLVizzSnapshot,
  type MLVizzSourceSystem,
  type MLVizzTimesheetActual,
} from "../src/integrations/mlvizz/contracts";

const repoRoot = process.cwd();
const publishedAt = "2026-06-23T02:15:00.000Z";
const extractedAt = "2026-06-23T01:45:00.000Z";
const ingestedAt = "2026-06-23T02:20:00.000Z";

function lineage(sourceSystem: MLVizzSourceSystem, sourceRecordId: string, deleted = false): MLVizzLineage {
  return {
    sourceSystem,
    sourceRecordId,
    sourceUpdatedAt: "2026-06-23T01:30:00.000Z",
    sourceExtractedAt: extractedAt,
    mlvizzPublishedAt: publishedAt,
    applicationIngestedAt: ingestedAt,
    deleted,
  };
}

function cloneSnapshot(snapshot: MLVizzSnapshot): MLVizzSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as MLVizzSnapshot;
}

const peopleSeed = [
  ["person-ava", "Ava Taylor", "Principal Consultant", "Principal", "Data & AI", "person-maya", "Sydney", "Data strategy|Azure|APA|Stakeholder leadership", 2200, 1120],
  ["person-ben", "Ben O'Connor", "Agentic AI Engineer", "Senior Consultant", "Agentic AI", "person-noah", "Melbourne", "Agents|OpenAI|Python|Powerlink", 1850, 920],
  ["person-charlie", "Charlie Nguyen", "Cloud Architect", "Lead Consultant", "Cloud", "person-maya", "Brisbane", "Azure|AWS|CBA|Landing zones", 2050, 1030],
  ["person-diya", "Diya Patel", "Data Engineer", "Consultant", "Data Addiction", "person-priya", "Sydney", "Databricks|Snowflake|Cleanaway|Python", 1550, 720],
  ["person-eli", "Eli Brooks", "Delivery Lead", "Principal", "Innovation Hub", "person-sofia", "Perth", "Delivery governance|Presales|Product|AGL", 2150, 1100],
  ["person-farah", "Farah Haddad", "AI Consultant", "Consultant", "Agentic AI", "person-noah", "Sydney", "Agents|Prompt engineering|CBA|Training", 1450, 680],
  ["person-george", "George Williams", "Managed Services Engineer", "Consultant", "Cloud", "person-priya", "Adelaide", "Managed services|Azure|Support|APA", 1350, 690],
  ["person-hana", "Hana Sato", "Solution Designer", "Senior Consultant", "Data & AI", "person-maya", "Tokyo", "Solution design|Data mesh|Powerlink|Japanese", 1900, 980],
  ["person-isaac", "Isaac Mensah", "Graduate Analyst", "Graduate", "Data Addiction", "person-priya", "Melbourne", "SQL|Power BI|Data quality|Training", 850, 420],
  ["person-juno", "Juno Kelly", "People Partner", "Manager", "Corporate", "person-sofia", "Sydney", "Workforce planning|Employment Hero|Onboarding", 0, 760],
  ["person-kai", "Kai Roberts", "Sales Engineer", "Consultant", "Innovation Hub", "person-sofia", "Sydney", "Presales|HubSpot|Demos|CBA", 1600, 810],
  ["person-lara", "Lara Evans", "Data Product Manager", "Senior Consultant", "Data & AI", "person-maya", "Brisbane", "Product|Data governance|Stakeholder leadership", 1750, 900],
] as const;

const people: MLVizzPerson[] = peopleSeed.map((item, index) => ({
  canonicalPersonId: item[0],
  mlvizzPersonId: `mlv-person-${String(index + 1).padStart(3, "0")}`,
  employmentHeroEmployeeId: `SIA-${String(index + 1).padStart(3, "0")}`,
  astuteWorkerId: `ast-worker-${String(index + 1).padStart(3, "0")}`,
  email: `${item[1].toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@synthetic.simplyai.example`,
  displayName: item[1],
  employmentStatus: "active",
  employmentType: "Permanent",
  startDate: "2024-07-01",
  endDate: null,
  contractorEndDate: null,
  homePillar: item[4],
  managerCanonicalPersonId: item[5],
  role: item[2],
  grade: item[3],
  location: item[6],
  region: item[6] === "Tokyo" ? "APAC" : "ANZ",
  country: item[6] === "Tokyo" ? "Japan" : "Australia",
  timeZone: item[6] === "Tokyo" ? "Asia/Tokyo" : "Australia/Sydney",
  fte: 1,
  standardHoursPerDay: 8,
  workPattern: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  skills: item[7].split("|"),
  certifications: index % 3 === 0 ? ["Verified synthetic certification"] : [],
  billRate: item[8],
  costRate: item[9],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  inactive: false,
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage("employment-hero", `eh-${String(index + 1).padStart(3, "0")}`),
}));

const clients: MLVizzClient[] = [
  ["client-apa", "APA Group", "Energy", "person-ava", true],
  ["client-agl", "AGL Energy", "Utilities", "person-eli", true],
  ["client-cleanaway", "Cleanaway", "Waste services", "person-kai", true],
  ["client-cba", "Commonwealth Bank", "Financial services", "person-ava", true],
].map((item, index) => ({
  canonicalClientId: item[0] as string,
  mlvizzClientId: `mlv-client-${String(index + 1).padStart(3, "0")}`,
  hubspotCompanyId: `hs-company-${String(8300 + index)}`,
  xeroContactId: `xero-contact-${String(9100 + index)}`,
  clientName: item[1] as string,
  industry: item[2] as string,
  accountOwnerCanonicalPersonId: item[3] as string,
  strategicAccount: item[4] as boolean,
  effectiveDate: "2026-06-23",
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage("hubspot", `hs-company-${String(8300 + index)}`),
}));

const projects = [
  ["project-apa-dpu", "client-apa", "APA-DPU", "APA Data Platform Uplift", "active", "person-ava", "Data & AI", "2026-07-06", "2026-07-31", "green"],
  ["project-agl-advisory", "client-agl", "AGL-ADV", "AGL Advisory Principal", "active", "person-eli", "Innovation Hub", "2026-07-06", "2026-08-14", "green"],
  ["project-cleanaway-forecast", "client-cleanaway", "CLN-FC", "Forecasting Pilot", "proposed", "person-diya", "Data Addiction", "2026-07-13", "2026-08-28", "amber"],
  ["project-cba-agent", "client-cba", "CBA-AI", "Agent Operating Model", "active", "person-ben", "Agentic AI", "2026-07-06", "2026-08-08", "red"],
  ["project-simplyai-enablement", "client-apa", "SIA-EN", "Internal Enablement", "active", "person-juno", "Corporate", "2026-07-06", "2026-07-24", "green"],
] as const satisfies readonly (readonly [string, string, string, string, MLVizzProject["engagementStatus"], string, string, string, string, MLVizzProject["health"]])[];

const projectRecords: MLVizzProject[] = projects.map((item, index) => ({
  canonicalProjectId: item[0],
  mlvizzProjectId: `mlv-project-${String(index + 1).padStart(3, "0")}`,
  hubspotDealId: `hs-deal-${String(9800 + index)}`,
  astuteJobId: `ast-job-${String(7600 + index)}`,
  xeroTrackingCategoryId: `xero-track-${String(6600 + index)}`,
  canonicalClientId: item[1],
  projectCode: item[2],
  projectName: item[3],
  engagementStatus: item[4],
  deliveryLeadCanonicalPersonId: item[5],
  pillar: item[6],
  startDate: item[7],
  endDate: item[8],
  health: item[9],
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage(index === 2 ? "hubspot" : "mlvizz", `project-source-${index + 1}`),
}));

const opportunities = [
  ["opp-cleanaway-data", "client-cleanaway", "Cleanaway Forecasting Pilot", "qualified", 80, 180000, "2026-07-01", "2026-07-13", "2026-08-28", "person-kai", "Data Engineer", "Consultant", "Databricks|Python|Cleanaway", 60, "critical", "Sydney", "Data Addiction", "2026-07-18"],
  ["opp-powerlink-agent", "client-apa", "Powerlink Agentic AI Pilot", "proposal", 50, 260000, "2026-07-10", "2026-07-20", "2026-09-04", "person-ben", "Agentic AI Engineer", "Senior Consultant", "Agents|Powerlink|Python", 100, "high", "Melbourne", "Agentic AI", "2026-07-25"],
  ["opp-cba-principal", "client-cba", "CBA Data Strategy Extension", "closed_won", 95, 140000, "2026-06-28", "2026-07-14", "2026-08-07", "person-ava", "Principal Consultant", "Principal", "Stakeholder leadership|CBA|Data strategy", 40, "high", "Sydney", "Data & AI", "2026-08-01"],
  ["opp-agl-training", "client-agl", "AGL AI Training", "qualified", 65, 90000, "2026-07-15", "2026-08-03", "2026-08-28", "person-eli", "AI Consultant", "Consultant", "Training|Prompt engineering|AGL", 50, "medium", "Perth", "Innovation Hub", "2026-08-05"],
  ["opp-apa-managed", "client-apa", "APA Managed Service", "proposal", 45, 120000, null, null, null, "person-george", "Managed Services Engineer", "Consultant", "Managed services|Azure|Support", 50, "medium", "Adelaide", "Cloud", "2026-08-15"],
  ["opp-cba-demo", "client-cba", "CBA Demo Support", "closed_lost", 0, 30000, "2026-06-20", "2026-07-01", "2026-07-11", "person-kai", "Sales Engineer", "Consultant", "Presales|Demos|CBA", 20, "medium", "Sydney", "Innovation Hub", "2026-07-01"],
] as const satisfies readonly (readonly [string, string, string, MLVizzOpportunity["dealStage"], number, number, string | null, string | null, string | null, string, string, string, string, number, MLVizzOpportunity["priority"], string, string, string])[];

const opportunityRecords: MLVizzOpportunity[] = opportunities.map((item, index) => ({
  canonicalOpportunityId: item[0],
  mlvizzOpportunityId: `mlv-opp-${String(index + 1).padStart(3, "0")}`,
  hubspotDealId: `hs-deal-${String(984100 + index)}`,
  canonicalClientId: item[1],
  opportunityName: item[2],
  dealStage: item[3],
  probabilityPct: item[4],
  estimatedValue: item[5],
  currency: "AUD",
  expectedCloseDate: item[6],
  expectedDeliveryStart: item[7],
  expectedDeliveryEnd: item[8],
  ownerCanonicalPersonId: item[9],
  requiredRole: item[10],
  requiredGrade: item[11],
  requiredSkills: item[12].split("|"),
  allocationPct: item[13],
  priority: item[14],
  location: item[15],
  pillar: item[16],
  expiresAt: item[17],
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage("hubspot", `hs-deal-${String(984100 + index)}`),
}));

const requests: MLVizzResourceRequest[] = opportunityRecords.slice(0, 5).flatMap((opportunity, index) => [
  {
    canonicalRequestId: `request-${String(index + 1).padStart(3, "0")}`,
    canonicalOpportunityId: opportunity.canonicalOpportunityId,
    canonicalProjectId: projectRecords[index % projectRecords.length].canonicalProjectId,
    requestedRole: opportunity.requiredRole,
    requestedGrade: opportunity.requiredGrade,
    requiredSkills: opportunity.requiredSkills,
    startDate: opportunity.expectedDeliveryStart ?? "2026-08-01",
    endDate: opportunity.expectedDeliveryEnd ?? "2026-08-29",
    allocationPct: opportunity.allocationPct,
    status: index === 0 ? "open" : "matched",
    requestedByCanonicalPersonId: opportunity.ownerCanonicalPersonId,
    schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
    lineage: lineage("resource-app", `resource-request-${index + 1}`),
  },
]);

requests.push(
  ...["Cloud Architect", "Data Product Manager", "People Partner"].map((role, offset) => ({
    canonicalRequestId: `request-extra-${offset + 1}`,
    canonicalOpportunityId: opportunityRecords[offset].canonicalOpportunityId,
    canonicalProjectId: projectRecords[(offset + 2) % projectRecords.length].canonicalProjectId,
    requestedRole: role,
    requestedGrade: offset === 0 ? "Lead Consultant" : "Senior Consultant",
    requiredSkills: offset === 0 ? ["Azure", "AWS"] : offset === 1 ? ["Product", "Data governance"] : ["Workforce planning"],
    startDate: "2026-07-20",
    endDate: "2026-08-15",
    allocationPct: 40,
    status: offset === 0 ? ("waiting_list" as const) : ("open" as const),
    requestedByCanonicalPersonId: "person-ava",
    schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
    lineage: lineage("resource-app", `resource-request-extra-${offset + 1}`),
  })),
);

const allocationSeed = [
  ["alloc-apa-ava", "person-ava", "project-apa-dpu", "billable", "planned", "Principal Data Strategist", "2026-07-06", "2026-07-31", 60, 100],
  ["alloc-agl-ava", "person-ava", "project-agl-advisory", "presales", "planned", "Advisory Principal", "2026-07-06", "2026-07-31", 40, 100],
  ["alloc-cba-ben", "person-ben", "project-cba-agent", "billable", "at_risk", "Agentic AI Engineer", "2026-07-06", "2026-07-24", 100, 90],
  ["alloc-powerlink-ben", "person-ben", "project-apa-dpu", "presales", "tentative", "Powerlink Solution Engineer", "2026-07-13", "2026-07-24", 100, 50],
  ["alloc-cba-charlie", "person-charlie", "project-cba-agent", "billable", "planned", "Cloud Architect", "2026-07-06", "2026-07-24", 100, 95],
  ["alloc-leave-farah", "person-farah", "project-simplyai-enablement", "leave", "planned", "Annual Leave", "2026-07-10", "2026-07-14", 50, 100],
  ["alloc-agl-eli", "person-eli", "project-agl-advisory", "business-development", "planned", "Delivery Lead", "2026-07-06", "2026-07-31", 100, 100],
  ["alloc-managed-george", "person-george", "project-apa-dpu", "managed-service", "planned", "Managed Services Engineer", "2026-07-06", "2026-07-31", 100, 100],
  ["alloc-hana-powerlink", "person-hana", "project-apa-dpu", "billable", "planned", "Solution Designer", "2026-07-06", "2026-07-31", 80, 80],
  ["alloc-lara-product", "person-lara", "project-simplyai-enablement", "internal", "planned", "Product Manager", "2026-07-06", "2026-07-31", 80, 100],
  ["alloc-kai-presales", "person-kai", "project-cba-agent", "presales", "tentative", "Sales Engineer", "2026-07-14", "2026-07-25", 50, 60],
  ["alloc-cleanaway-diya", "person-diya", "project-cleanaway-forecast", "billable", "tentative", "Data Engineer", "2026-07-13", "2026-08-28", 60, 80],
  ["alloc-isaac-training", "person-isaac", "project-simplyai-enablement", "training", "planned", "Graduate Analyst", "2026-07-06", "2026-07-17", 40, 100],
  ["alloc-juno-workforce", "person-juno", "project-simplyai-enablement", "internal", "planned", "People Partner", "2026-07-06", "2026-07-31", 60, 100],
  ["alloc-unfilled-cleanaway", null, "project-cleanaway-forecast", "billable", "requested", "Data Engineer", "2026-07-13", "2026-08-28", 60, 80],
  ["hold-powerlink-unfilled", null, "project-apa-dpu", "presales", "waiting_list", "Agentic AI Engineer", "2026-07-20", "2026-09-04", 100, 50],
  ["hold-cba-principal", null, "project-cba-agent", "billable", "tentative", "Principal Consultant", "2026-07-14", "2026-08-07", 40, 95],
  ["hold-agl-training", null, "project-agl-advisory", "training", "tentative", "AI Consultant", "2026-08-03", "2026-08-28", 50, 65],
  ["hold-apa-managed", null, "project-apa-dpu", "managed-service", "tentative", "Managed Services Engineer", "2026-08-01", "2026-08-29", 50, 45],
] as const;

const plannedAllocations: MLVizzPlannedAllocation[] = allocationSeed.map((item, index) => ({
  canonicalAllocationId: item[0],
  canonicalPersonId: item[1],
  canonicalProjectId: item[2],
  canonicalRequestId: requests[index % requests.length].canonicalRequestId,
  allocationType: item[3],
  status: item[4],
  role: item[5],
  startDate: item[6],
  endDate: item[7],
  allocationPct: item[8],
  confidencePct: item[9],
  source: "synthetic-mlvizz",
  notes: item[4] === "tentative" ? "Synthetic tentative hold." : "Synthetic planned allocation.",
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage("resource-app", item[0]),
}));

const leaveEvents: MLVizzLeaveEvent[] = [
  ["leave-farah-july", "person-farah", "Annual leave", "2026-07-10T09:00:00.000+10:00", "2026-07-14T17:00:00.000+10:00", 20],
  ["leave-charlie-july", "person-charlie", "Conference", "2026-07-18T09:00:00.000+10:00", "2026-07-19T17:00:00.000+10:00", 16],
  ["leave-juno-july", "person-juno", "Personal leave", "2026-07-21T09:00:00.000+10:00", "2026-07-21T17:00:00.000+10:00", 8],
].map((item, index) => ({
  canonicalLeaveId: item[0] as string,
  canonicalPersonId: item[1] as string,
  employmentHeroLeaveId: `eh-leave-${index + 1}`,
  leaveType: item[2] as string,
  startDateTime: item[3] as string,
  endDateTime: item[4] as string,
  hours: item[5] as number,
  approvalStatus: "approved",
  effectiveDate: "2026-07-01",
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage("employment-hero", `eh-leave-${index + 1}`),
}));

const timesheetActuals: MLVizzTimesheetActual[] = ["2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"].flatMap((date, index) => [
  {
    canonicalTimesheetEntryId: `ts-ava-${index + 1}`,
    astuteTimesheetId: `ast-ts-ava-${index + 1}`,
    canonicalPersonId: "person-ava",
    canonicalProjectId: "project-apa-dpu",
    workDate: date,
    submittedHours: 4.8,
    approvedHours: index < 8 ? 4.8 : 0,
    billableHours: index < 8 ? 4.8 : 0,
    nonBillableHours: 0,
    approvalStatus: index < 8 ? "approved" : "submitted",
    submittedAt: `${date}T18:00:00.000+10:00`,
    approvedAt: index < 8 ? `${date}T19:00:00.000+10:00` : null,
    historicalCorrection: false,
    schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
    lineage: lineage("astute", `ast-ts-ava-${index + 1}`),
  },
]);

const financialActuals = [
  ["fin-apa-001", "client-apa", "project-apa-dpu", "SIA-1001", "paid", 42000, 42000, "2026-07"],
  ["fin-agl-001", "client-agl", "project-agl-advisory", "SIA-1002", "overdue", 38000, 0, "2026-07"],
  ["fin-cba-001", "client-cba", "project-cba-agent", "SIA-1003", "authorised", 52000, 0, "2026-07"],
  ["fin-cleanaway-001", "client-cleanaway", "project-cleanaway-forecast", "SIA-1004", "submitted", 22000, 0, "2026-08"],
  ["fin-apa-002", "client-apa", "project-apa-dpu", "SIA-1005", "paid", 18000, 18000, "2026-06"],
  ["fin-agl-002", "client-agl", null, "SIA-1006", "draft", 12000, 0, "2026-08"],
] as const satisfies readonly (readonly [string, string, string | null, string, MLVizzFinancialActual["status"], number, number, string])[];

const financialRecords: MLVizzFinancialActual[] = financialActuals.map((item, index) => ({
  canonicalFinancialTransactionId: item[0],
  xeroTransactionId: `xero-invoice-${index + 1}`,
  canonicalClientId: item[1],
  canonicalProjectId: item[2],
  invoiceNumber: item[3],
  invoiceDate: index < 3 ? "2026-07-15" : "2026-08-01",
  dueDate: index === 1 ? "2026-07-20" : "2026-08-14",
  paymentDate: item[4] === "paid" ? "2026-07-25" : null,
  status: item[4],
  currency: "AUD",
  netAmount: item[5],
  taxAmount: Math.round(item[5] * 0.1),
  grossAmount: Math.round(item[5] * 1.1),
  paidAmount: item[6],
  accountingPeriod: item[7],
  schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  lineage: lineage("xero", `xero-invoice-${index + 1}`),
}));

function refreshRun(datasetName: MLVizzRefreshRun["datasetName"], sourceSystem: MLVizzSourceSystem, recordsRead: number, status: MLVizzRefreshRun["status"] = "fresh", rejected = 0): MLVizzRefreshRun {
  return {
    datasetName,
    sourceSystem,
    refreshRunId: `run-${datasetName}-${sourceSystem}-20260623`,
    extractionStartedAt: "2026-06-23T01:00:00.000Z",
    extractionCompletedAt: extractedAt,
    mlvizzProcessingCompletedAt: "2026-06-23T02:05:00.000Z",
    mlvizzPublishedAt: publishedAt,
    recordsRead,
    recordsAccepted: recordsRead - rejected,
    recordsRejected: rejected,
    recordsInserted: Math.max(1, Math.floor(recordsRead / 4)),
    recordsUpdated: Math.max(0, recordsRead - Math.floor(recordsRead / 4)),
    recordsDeleted: 0,
    status,
    dataQualityStatus: rejected > 0 ? "warning" : status === "failed" ? "failed" : "accepted",
    failureSummary: status === "failed" ? "Synthetic failure run retained last-known-good data." : rejected > 0 ? `${rejected} records quarantined for review.` : null,
    lastSuccessfulRefreshAt: status === "failed" ? "2026-06-22T02:15:00.000Z" : publishedAt,
    schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
  };
}

const refreshRuns: MLVizzRefreshRun[] = [
  refreshRun("people", "employment-hero", people.length),
  refreshRun("leave", "employment-hero", leaveEvents.length),
  refreshRun("opportunities", "hubspot", opportunityRecords.length),
  refreshRun("projects", "mlvizz", projectRecords.length),
  refreshRun("timesheets", "astute", timesheetActuals.length),
  refreshRun("financials", "xero", financialRecords.length),
];

const identityMappings: MLVizzIdentityMapping[] = [
  ...people.flatMap((person) => [
    { canonicalId: person.canonicalPersonId, entityType: "person" as const, sourceSystem: "employment-hero" as const, sourceRecordId: person.employmentHeroEmployeeId, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null },
    { canonicalId: person.canonicalPersonId, entityType: "person" as const, sourceSystem: "astute" as const, sourceRecordId: person.astuteWorkerId ?? `ast-missing-${person.canonicalPersonId}`, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null },
  ]),
  ...clients.flatMap((client) => [
    { canonicalId: client.canonicalClientId, entityType: "client" as const, sourceSystem: "hubspot" as const, sourceRecordId: client.hubspotCompanyId, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null },
    { canonicalId: client.canonicalClientId, entityType: "client" as const, sourceSystem: "xero" as const, sourceRecordId: client.xeroContactId ?? `xero-missing-${client.canonicalClientId}`, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null },
  ]),
  ...opportunityRecords.map((opportunity) => ({ canonicalId: opportunity.canonicalOpportunityId, entityType: "opportunity" as const, sourceSystem: "hubspot" as const, sourceRecordId: opportunity.hubspotDealId, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null })),
  ...projectRecords.flatMap((project) => [
    { canonicalId: project.canonicalProjectId, entityType: "project" as const, sourceSystem: "mlvizz" as const, sourceRecordId: project.mlvizzProjectId, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null },
    { canonicalId: project.canonicalProjectId, entityType: "astute-job" as const, sourceSystem: "astute" as const, sourceRecordId: project.astuteJobId ?? `ast-missing-${project.canonicalProjectId}`, confidence: "confirmed" as const, validFrom: "2026-01-01", validTo: null },
  ]),
];

const reconciliation: MLVizzReconciliationSummary[] = refreshRuns.map((run, index) => ({
  reconciliationId: `rec-${index + 1}`,
  datasetName: run.datasetName,
  sourceSystem: run.sourceSystem,
  mlvizzCount: run.recordsAccepted,
  applicationCount: run.recordsAccepted,
  varianceCount: 0,
  status: "matched",
  checkedAt: "2026-06-23T02:30:00.000Z",
  notes: "Synthetic reconciliation matched.",
}));

function baseSnapshot(packId: string): MLVizzSnapshot {
  return {
    metadata: {
      schemaVersion: MLVIZZ_RESOURCE_SCHEMA_VERSION,
      packId,
      generatedAt: "2026-06-23T03:00:00.000Z",
      businessEffectiveDate: "2026-07-06",
      sourceExtractedAt: extractedAt,
      mlvizzPublishedAt: publishedAt,
      applicationIngestedAt: ingestedAt,
      lastKnownGoodSnapshotId: `${packId}-lkg-20260622`,
    },
    people,
    leaveEvents,
    clients,
    opportunities: opportunityRecords,
    projects: projectRecords,
    resourceRequests: requests,
    plannedAllocations,
    timesheetActuals,
    financialActuals: financialRecords,
    refreshRuns,
    identityMappings,
    failedRecords: [],
    reconciliation,
  };
}

function functionalDemoSnapshot(): MLVizzSnapshot {
  const snapshot = cloneSnapshot(baseSnapshot("functional-demo"));
  snapshot.opportunities.push({
    ...snapshot.opportunities[0],
    canonicalOpportunityId: "opp-enterprise-scale",
    mlvizzOpportunityId: "mlv-opp-scale-001",
    hubspotDealId: "hs-deal-scale-001",
    opportunityName: "Enterprise AI Scaling Programme",
    estimatedValue: 640000,
    probabilityPct: 70,
    allocationPct: 120,
    priority: "critical",
    lineage: lineage("hubspot", "hs-deal-scale-001"),
  });
  snapshot.resourceRequests.push({
    ...snapshot.resourceRequests[0],
    canonicalRequestId: "request-enterprise-scale",
    canonicalOpportunityId: "opp-enterprise-scale",
    allocationPct: 120,
    status: "open",
    lineage: lineage("resource-app", "request-enterprise-scale"),
  });
  snapshot.reconciliation = snapshot.reconciliation.map((item) =>
    item.datasetName === "opportunities" ? { ...item, mlvizzCount: item.mlvizzCount + 1, applicationCount: item.applicationCount + 1 } : item,
  );
  return snapshot;
}

function edgeCaseSnapshot(): MLVizzSnapshot {
  const snapshot = cloneSnapshot(baseSnapshot("edge-cases"));
  snapshot.metadata.mlvizzPublishedAt = "2026-06-22T02:15:00.000Z";
  snapshot.refreshRuns = snapshot.refreshRuns.map((run) =>
    run.datasetName === "financials"
      ? { ...run, status: "failed", dataQualityStatus: "failed", recordsRejected: 2, failureSummary: "Synthetic Xero timeout; retained last-known-good financials.", lastSuccessfulRefreshAt: "2026-06-21T02:15:00.000Z" }
      : run.datasetName === "opportunities"
        ? { ...run, status: "warning", dataQualityStatus: "warning", recordsRejected: 1, failureSummary: "Duplicate HubSpot deal quarantined." }
        : run,
  );
  snapshot.failedRecords = [
    {
      failedRecordId: "failed-duplicate-hubspot-deal",
      refreshRunId: "run-opportunities-hubspot-20260623",
      datasetName: "opportunities",
      sourceSystem: "hubspot",
      sourceRecordId: "hs-deal-duplicate-001",
      failureReason: "Duplicate source deal mapped to two canonical opportunities.",
      quarantinedAt: "2026-06-23T02:10:00.000Z",
      reprocessStatus: "pending",
    },
    {
      failedRecordId: "failed-xero-tracking-missing",
      refreshRunId: "run-financials-xero-20260623",
      datasetName: "financials",
      sourceSystem: "xero",
      sourceRecordId: "xero-invoice-missing-tracking",
      failureReason: "Xero invoice has no reliable project tracking dimension.",
      quarantinedAt: "2026-06-23T02:12:00.000Z",
      reprocessStatus: "pending",
    },
  ];
  snapshot.timesheetActuals.push({
    ...snapshot.timesheetActuals[0],
    canonicalTimesheetEntryId: "ts-correction-001",
    astuteTimesheetId: "ast-ts-correction-001",
    approvedHours: 6,
    billableHours: 6,
    historicalCorrection: true,
    lineage: { ...lineage("astute", "ast-ts-correction-001"), sourceUpdatedAt: "2026-06-23T02:00:00.000Z" },
  });
  snapshot.people[11] = { ...snapshot.people[11], employmentStatus: "inactive", inactive: true, effectiveTo: "2026-07-31", lineage: { ...snapshot.people[11].lineage, deleted: true } };
  snapshot.reconciliation = snapshot.reconciliation.map((item) =>
    item.datasetName === "financials"
      ? { ...item, status: "failed", varianceCount: 2, notes: "Financial refresh failed; using last-known-good data." }
      : item.datasetName === "opportunities"
        ? { ...item, status: "variance", varianceCount: 1, notes: "One duplicate opportunity quarantined." }
        : item,
  );
  return snapshot;
}

const catalogue = `# Synthetic MLVizz fixture catalogue

All packs use the canonical \`${MLVIZZ_RESOURCE_SCHEMA_VERSION}\` contract and masked synthetic records.

## nominal-small

Rapid smoke-test pack with 12 people, 4 clients, 5 projects, 6 opportunities, 8 resource requests, planned allocations, tentative holds, leave, Astute timesheets and Xero financials.

## functional-demo

Leadership/demo pack extending nominal data with a higher-value enterprise opportunity and open request while keeping provider output contract-compatible.

## edge-cases

Failure and correction pack with stale financial refresh, duplicate HubSpot quarantine, missing Xero project mapping, historical Astute correction and inactive/deleted person handling.
`;

async function writeSnapshot(packName: string, snapshot: MLVizzSnapshot) {
  const dir = path.join(repoRoot, "fixtures", "mlvizz", "v1", packName);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
}

async function main() {
  await writeSnapshot("nominal-small", baseSnapshot("nominal-small"));
  await writeSnapshot("functional-demo", functionalDemoSnapshot());
  await writeSnapshot("edge-cases", edgeCaseSnapshot());
  await mkdir(path.join(repoRoot, "fixtures", "mlvizz", "v1"), { recursive: true });
  await writeFile(path.join(repoRoot, "fixtures", "mlvizz", "v1", "CATALOGUE.md"), catalogue);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
