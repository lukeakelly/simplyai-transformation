export const RESOURCE_PLANNING_SCHEMA_VERSION = "resource-planning-v2" as const;

export type ResourcePlanningSchemaVersion = typeof RESOURCE_PLANNING_SCHEMA_VERSION;
export type DemandClass = "confirmed" | "tentative" | "weighted_pipeline";
export type DemandLifecycleStatus = "draft" | "qualified" | "proposed" | "confirmed" | "closed_won" | "closed_lost" | "expired";
export type BookingStrength = "soft" | "hard";
export type BookingLifecycleStatus = "proposed" | "held" | "requested" | "approved" | "committed" | "released" | "cancelled" | "expired";
export type AssignmentLifecycleStatus = "planned" | "active" | "complete" | "cancelled";
export type WorkClass = "client_delivery" | "managed_service" | "presales" | "business_development" | "governed_internal" | "training";
export type Recoverability = "recoverable" | "partially_recoverable" | "non_recoverable";
export type FundingSource = "client" | "internal_investment" | "overhead" | "sales" | "training_budget";
export type BenchExposurePolicy = "show_as_bench_exposure" | "show_as_non_recoverable" | "show_as_both";
export type TimesheetActualStatus = "submitted_time" | "approved_time" | "rejected_time" | "corrected_time";
export type FinanceActualStatus = "invoiced_actual" | "paid_actual" | "voided_actual";
export type SowStatus = "not_required" | "draft" | "issued" | "signed" | "expired" | "unsigned_extension";
export type PoStatus = "not_required" | "requested" | "received" | "missing" | "expired";
export type FinanceApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type CommercialOverlayType = "missing_po_for_hard_booked_work" | "unsigned_sow_for_confirmed_demand" | "unsigned_extension_inside_threshold" | "work_underway_at_risk";
export type AttentionColor = "green" | "amber" | "red";
export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionActionStatus = "open" | "assigned" | "deferred" | "resolved" | "suppressed";
export type CapabilityEvidenceType = "self_assessed" | "manager_assessed" | "delivery_evidence" | "certification" | "client_feedback";
export type ResourcePlanningAggregateType = "resource_demand" | "booking" | "named_assignment" | "scenario" | "comment" | "exception_action" | "commercial_authority";

export type EvidenceRef = {
  sourceSystem: "mlvizz" | "resource-app" | "employment-hero" | "hubspot" | "astute" | "xero" | "capability-governance";
  sourceRecordId: string;
  sourceLabel: string;
  observedAt: string;
  url?: string;
};

export type AllocationContour = {
  contourId: string;
  startDate: string;
  endDate: string;
  hoursPerDay?: number;
  fte?: number;
  allocationPct?: number;
  daysOfWeek?: number[];
};

export type CapabilityRequirement = {
  capabilityId: string;
  capabilityName: string;
  minimumProficiency: number;
  mandatory: boolean;
};

export type CapabilityEvidence = {
  evidenceId: string;
  evidenceType: CapabilityEvidenceType;
  source: EvidenceRef;
  assessedAt: string;
  expiresAt: string | null;
};

export type CapabilityProfileItem = {
  capabilityId: string;
  capabilityName: string;
  proficiency: number;
  evidence: CapabilityEvidence[];
  authoritative: boolean;
};

export type SimplyaiCapabilityProfile = {
  profileId: string;
  canonicalPersonId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  items: CapabilityProfileItem[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type ResourceDemandV2 = {
  demandId: string;
  canonicalOpportunityId: string | null;
  canonicalProjectId: string | null;
  canonicalClientId: string;
  demandClass: DemandClass;
  lifecycleStatus: DemandLifecycleStatus;
  role: string;
  grade: string;
  capabilityRequirements: CapabilityRequirement[];
  locationConstraints: string[];
  timePhasedRequirement: AllocationContour[];
  probabilityPct: number;
  commercialExpectedValue: number;
  currency: string;
  sourceEvidence: EvidenceRef[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type BookingV2 = {
  bookingId: string;
  demandId: string | null;
  scenarioId: string | null;
  canonicalPersonId: string | null;
  canonicalProjectId: string | null;
  bookingStrength: BookingStrength;
  lifecycleStatus: BookingLifecycleStatus;
  timePhasedBooking: AllocationContour[];
  approvalEvidence: EvidenceRef[];
  sourceEvidence: EvidenceRef[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type NamedAssignmentV2 = {
  assignmentId: string;
  bookingId: string;
  canonicalPersonId: string;
  canonicalProjectId: string;
  workClass: WorkClass;
  internalWorkCategoryId: string | null;
  lifecycleStatus: AssignmentLifecycleStatus;
  timePhasedAllocation: AllocationContour[];
  deliveryStartEvidence: EvidenceRef[];
  deliveryEndEvidence: EvidenceRef[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type TimesheetActualV2 = {
  actualId: string;
  canonicalPersonId: string;
  canonicalProjectId: string;
  workDate: string;
  submittedHours: number;
  approvedHours: number;
  status: TimesheetActualStatus;
  sourceEvidence: EvidenceRef[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type FinanceActualV2 = {
  financeActualId: string;
  canonicalClientId: string;
  canonicalProjectId: string | null;
  invoiceDate: string;
  paidDate: string | null;
  netAmount: number;
  paidAmount: number;
  currency: string;
  status: FinanceActualStatus;
  sourceEvidence: EvidenceRef[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type CommercialAuthorityV2 = {
  authorityId: string;
  canonicalProjectId: string;
  canonicalOpportunityId: string | null;
  sowStatus: SowStatus;
  poStatus: PoStatus;
  financeApprovalStatus: FinanceApprovalStatus;
  authorityValidFrom: string;
  authorityValidTo: string | null;
  authorisedOverrideEvidence: EvidenceRef[];
  sourceEvidence: EvidenceRef[];
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type CommercialRiskOverlayV2 = {
  overlayId: string;
  overlayType: CommercialOverlayType;
  canonicalProjectId: string;
  severity: ExceptionSeverity;
  statusText: string;
  reason: string;
  sourceEvidence: EvidenceRef[];
  recommendedAction: string;
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type EffectiveCapacityDay = {
  canonicalPersonId: string;
  date: string;
  contractualHours: number;
  approvedLeaveHours: number;
  publicHolidayHours: number;
  inactiveHours: number;
  sourceEvidence: EvidenceRef[];
};

export type InternalWorkCategory = {
  categoryId: string;
  name: string;
  recoverability: Recoverability;
  fundingSource: FundingSource;
  benchExposurePolicy: BenchExposurePolicy;
  governanceOwner: string;
  active: boolean;
};

export type ScenarioV2 = {
  scenarioId: string;
  name: string;
  ownerCanonicalPersonId: string;
  baselineSnapshotId: string;
  lifecycleStatus: "draft" | "shared" | "approved" | "archived";
  createdAt: string;
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type AttentionSignal = {
  signalId: string;
  color: AttentionColor;
  statusText: string;
  reason: string;
  sourceEvidence: EvidenceRef[];
  recommendedAction: string;
  thresholdId?: string;
};

export type ExceptionThreshold = {
  thresholdId: string;
  name: string;
  exceptionType: "capacity" | "financial" | "timing" | "sla" | "commercial";
  severity: ExceptionSeverity;
  limitHours?: number;
  limitDays?: number;
  limitAmount?: number;
  active: boolean;
};

export type ExceptionAction = {
  actionId: string;
  exceptionType: ExceptionThreshold["exceptionType"];
  severity: ExceptionSeverity;
  thresholdId: string;
  status: ExceptionActionStatus;
  ownerCanonicalPersonId: string | null;
  dueAt: string | null;
  recommendedAction: string;
  evidenceRefs: EvidenceRef[];
  sourceCalculationId: string;
  schemaVersion: ResourcePlanningSchemaVersion;
};

export type ResourcePlanningSourceDataEnvelope = {
  envelopeId: string;
  idempotencyKey: string;
  schemaVersion: ResourcePlanningSchemaVersion;
  aggregateType: ResourcePlanningAggregateType;
  aggregateId: string;
  operation: "created" | "updated" | "deleted";
  sourceEventSequence: number;
  occurredAt: string;
  correlationId: string;
  payload: ResourceDemandV2 | BookingV2 | NamedAssignmentV2 | ScenarioV2 | ExceptionAction | CommercialAuthorityV2;
};
