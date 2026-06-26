export const MLVIZZ_RESOURCE_SCHEMA_VERSION = "mlvizz-resource-v1" as const;

export type MLVizzResourceSchemaVersion = typeof MLVIZZ_RESOURCE_SCHEMA_VERSION;
export type MLVizzSourceSystem = "employment-hero" | "astute" | "hubspot" | "xero" | "resource-app" | "mlvizz";
export type MLVizzDatasetName =
  | "people"
  | "leave"
  | "clients"
  | "opportunities"
  | "projects"
  | "resource-requests"
  | "planned-allocations"
  | "timesheets"
  | "financials";

export type MLVizzRefreshStatus = "fresh" | "stale" | "warning" | "failed";
export type MLVizzDataQualityStatus = "accepted" | "warning" | "failed";
export type MLVizzAllocationStatus = "planned" | "tentative" | "requested" | "waiting_list" | "at_risk";
export type MLVizzTimesheetApprovalStatus = "submitted" | "approved" | "rejected" | "corrected";
export type MLVizzFinancialStatus = "draft" | "submitted" | "authorised" | "overdue" | "paid" | "voided";

export type MLVizzSnapshotMetadata = {
  schemaVersion: MLVizzResourceSchemaVersion;
  packId: string;
  generatedAt: string;
  businessEffectiveDate: string;
  sourceExtractedAt: string;
  mlvizzPublishedAt: string;
  applicationIngestedAt: string;
  lastKnownGoodSnapshotId: string;
};

export type MLVizzLineage = {
  sourceSystem: MLVizzSourceSystem;
  sourceRecordId: string;
  sourceUpdatedAt: string;
  sourceExtractedAt: string;
  mlvizzPublishedAt: string;
  applicationIngestedAt: string;
  deleted: boolean;
};

export type MLVizzPerson = {
  canonicalPersonId: string;
  mlvizzPersonId: string;
  employmentHeroEmployeeId: string;
  astuteWorkerId: string | null;
  email: string;
  displayName: string;
  employmentStatus: "active" | "inactive" | "contract-ended";
  employmentType: "Permanent" | "Contractor" | "Casual";
  startDate: string;
  endDate: string | null;
  contractorEndDate: string | null;
  homePillar: string;
  managerCanonicalPersonId: string | null;
  role: string;
  grade: string;
  location: string;
  region: string;
  country: string;
  timeZone: string;
  fte: number;
  standardHoursPerDay: number;
  workPattern: string[];
  skills: string[];
  certifications: string[];
  billRate: number;
  costRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  inactive: boolean;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzLeaveEvent = {
  canonicalLeaveId: string;
  canonicalPersonId: string;
  employmentHeroLeaveId: string;
  leaveType: string;
  startDateTime: string;
  endDateTime: string;
  hours: number;
  approvalStatus: "approved" | "pending" | "rejected";
  effectiveDate: string;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzClient = {
  canonicalClientId: string;
  mlvizzClientId: string;
  hubspotCompanyId: string;
  xeroContactId: string | null;
  clientName: string;
  industry: string;
  accountOwnerCanonicalPersonId: string | null;
  strategicAccount: boolean;
  effectiveDate: string;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzOpportunity = {
  canonicalOpportunityId: string;
  mlvizzOpportunityId: string;
  hubspotDealId: string;
  canonicalClientId: string;
  opportunityName: string;
  dealStage: "qualified" | "proposal" | "closed_won" | "closed_lost";
  probabilityPct: number;
  estimatedValue: number;
  currency: string;
  expectedCloseDate: string | null;
  expectedDeliveryStart: string | null;
  expectedDeliveryEnd: string | null;
  ownerCanonicalPersonId: string | null;
  requiredRole: string;
  requiredGrade: string;
  requiredSkills: string[];
  allocationPct: number;
  priority: "critical" | "high" | "medium";
  location: string;
  pillar: string;
  expiresAt: string;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzProject = {
  canonicalProjectId: string;
  mlvizzProjectId: string;
  hubspotDealId: string | null;
  astuteJobId: string | null;
  xeroTrackingCategoryId: string | null;
  canonicalClientId: string;
  projectCode: string;
  projectName: string;
  engagementStatus: "active" | "proposed" | "complete" | "paused";
  deliveryLeadCanonicalPersonId: string | null;
  pillar: string;
  startDate: string;
  endDate: string;
  health: "green" | "amber" | "red";
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzResourceRequest = {
  canonicalRequestId: string;
  canonicalOpportunityId: string;
  canonicalProjectId: string | null;
  requestedRole: string;
  requestedGrade: string;
  requiredSkills: string[];
  startDate: string;
  endDate: string;
  allocationPct: number;
  status: "open" | "matched" | "waiting_list" | "closed";
  requestedByCanonicalPersonId: string | null;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzPlannedAllocation = {
  canonicalAllocationId: string;
  canonicalPersonId: string | null;
  canonicalProjectId: string;
  canonicalRequestId: string | null;
  allocationType: "billable" | "managed-service" | "presales" | "business-development" | "internal" | "training" | "leave" | "bench";
  status: MLVizzAllocationStatus;
  role: string;
  startDate: string;
  endDate: string;
  allocationPct: number;
  confidencePct: number;
  source: "resource-app" | "synthetic-mlvizz";
  notes: string;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzTimesheetActual = {
  canonicalTimesheetEntryId: string;
  astuteTimesheetId: string;
  canonicalPersonId: string;
  canonicalProjectId: string;
  workDate: string;
  submittedHours: number;
  approvedHours: number;
  billableHours: number;
  nonBillableHours: number;
  approvalStatus: MLVizzTimesheetApprovalStatus;
  submittedAt: string;
  approvedAt: string | null;
  historicalCorrection: boolean;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzFinancialActual = {
  canonicalFinancialTransactionId: string;
  xeroTransactionId: string;
  canonicalClientId: string;
  canonicalProjectId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentDate: string | null;
  status: MLVizzFinancialStatus;
  currency: string;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  paidAmount: number;
  accountingPeriod: string;
  schemaVersion: MLVizzResourceSchemaVersion;
  lineage: MLVizzLineage;
};

export type MLVizzRefreshRun = {
  datasetName: MLVizzDatasetName;
  sourceSystem: MLVizzSourceSystem;
  refreshRunId: string;
  extractionStartedAt: string;
  extractionCompletedAt: string;
  mlvizzProcessingCompletedAt: string;
  mlvizzPublishedAt: string;
  recordsRead: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeleted: number;
  status: MLVizzRefreshStatus;
  dataQualityStatus: MLVizzDataQualityStatus;
  failureSummary: string | null;
  lastSuccessfulRefreshAt: string;
  schemaVersion: MLVizzResourceSchemaVersion;
};

export type MLVizzIdentityMapping = {
  canonicalId: string;
  entityType: "person" | "client" | "opportunity" | "project" | "astute-job" | "xero-tracking-dimension" | "application-record";
  sourceSystem: MLVizzSourceSystem;
  sourceRecordId: string;
  confidence: "confirmed" | "suggested" | "conflict";
  validFrom: string;
  validTo: string | null;
};

export type MLVizzFailedRecord = {
  failedRecordId: string;
  refreshRunId: string;
  datasetName: MLVizzDatasetName;
  sourceSystem: MLVizzSourceSystem;
  sourceRecordId: string;
  failureReason: string;
  quarantinedAt: string;
  reprocessStatus: "pending" | "reprocessed" | "ignored";
};

export type MLVizzReconciliationSummary = {
  reconciliationId: string;
  datasetName: MLVizzDatasetName;
  sourceSystem: MLVizzSourceSystem;
  mlvizzCount: number;
  applicationCount: number;
  varianceCount: number;
  status: "matched" | "variance" | "failed";
  checkedAt: string;
  notes: string;
};

export type MLVizzSnapshot = {
  metadata: MLVizzSnapshotMetadata;
  people: MLVizzPerson[];
  leaveEvents: MLVizzLeaveEvent[];
  clients: MLVizzClient[];
  opportunities: MLVizzOpportunity[];
  projects: MLVizzProject[];
  resourceRequests: MLVizzResourceRequest[];
  plannedAllocations: MLVizzPlannedAllocation[];
  timesheetActuals: MLVizzTimesheetActual[];
  financialActuals: MLVizzFinancialActual[];
  refreshRuns: MLVizzRefreshRun[];
  identityMappings: MLVizzIdentityMapping[];
  failedRecords: MLVizzFailedRecord[];
  reconciliation: MLVizzReconciliationSummary[];
};
