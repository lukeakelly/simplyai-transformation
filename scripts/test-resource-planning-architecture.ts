import {
  RESOURCE_PLANNING_SCHEMA_VERSION,
  type BookingV2,
  type CommercialAuthorityV2,
  type EffectiveCapacityDay,
  type EvidenceRef,
  type ExceptionThreshold,
  type InternalWorkCategory,
  type NamedAssignmentV2,
  type ResourceDemandV2,
} from "../src/lib/resource-planning-domain";
import { buildAttentionSignals, calculateResourcePlanningMetrics, contourHoursForDay, deriveCommercialRiskOverlays } from "../src/lib/resource-planning-calculations";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

const evidence: EvidenceRef = {
  sourceSystem: "mlvizz",
  sourceRecordId: "mlvizz-test-record-1",
  sourceLabel: "P0 deterministic architecture fixture",
  observedAt: "2026-07-06T00:00:00.000Z",
};

const days = ["2026-07-06", "2026-07-07", "2026-07-08"];

const effectiveCapacity: EffectiveCapacityDay[] = [
  { canonicalPersonId: "person-1", date: "2026-07-06", contractualHours: 8, approvedLeaveHours: 0, publicHolidayHours: 0, inactiveHours: 0, sourceEvidence: [evidence] },
  { canonicalPersonId: "person-1", date: "2026-07-07", contractualHours: 8, approvedLeaveHours: 2, publicHolidayHours: 0, inactiveHours: 0, sourceEvidence: [evidence] },
  { canonicalPersonId: "person-1", date: "2026-07-08", contractualHours: 8, approvedLeaveHours: 0, publicHolidayHours: 0, inactiveHours: 0, sourceEvidence: [evidence] },
];

const bookings: BookingV2[] = [
  {
    bookingId: "booking-hard-1",
    demandId: "demand-confirmed-1",
    scenarioId: null,
    canonicalPersonId: "person-1",
    canonicalProjectId: "project-authorised",
    bookingStrength: "hard",
    lifecycleStatus: "committed",
    timePhasedBooking: [{ contourId: "hard-contour-1", startDate: "2026-07-06", endDate: "2026-07-07", hoursPerDay: 6 }],
    approvalEvidence: [evidence],
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    bookingId: "booking-soft-1",
    demandId: "demand-tentative-1",
    scenarioId: null,
    canonicalPersonId: "person-1",
    canonicalProjectId: "project-risky",
    bookingStrength: "soft",
    lifecycleStatus: "held",
    timePhasedBooking: [{ contourId: "soft-contour-1", startDate: "2026-07-06", endDate: "2026-07-08", hoursPerDay: 4 }],
    approvalEvidence: [],
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    bookingId: "booking-hard-overrun",
    demandId: "demand-confirmed-2",
    scenarioId: null,
    canonicalPersonId: "person-1",
    canonicalProjectId: "project-risky",
    bookingStrength: "hard",
    lifecycleStatus: "committed",
    timePhasedBooking: [{ contourId: "overrun-contour-1", startDate: "2026-07-08", endDate: "2026-07-08", hoursPerDay: 10 }],
    approvalEvidence: [evidence],
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
];

const demands: ResourceDemandV2[] = [
  {
    demandId: "demand-confirmed-1",
    canonicalOpportunityId: "opp-1",
    canonicalProjectId: "project-authorised",
    canonicalClientId: "client-1",
    demandClass: "confirmed",
    lifecycleStatus: "confirmed",
    role: "AI Consultant",
    grade: "Senior",
    capabilityRequirements: [{ capabilityId: "cap-ai", capabilityName: "AI Delivery", minimumProficiency: 4, mandatory: true }],
    locationConstraints: ["AU"],
    timePhasedRequirement: [{ contourId: "confirmed-demand-contour", startDate: "2026-07-06", endDate: "2026-07-07", hoursPerDay: 8 }],
    probabilityPct: 100,
    commercialExpectedValue: 3200,
    currency: "AUD",
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    demandId: "demand-tentative-1",
    canonicalOpportunityId: "opp-2",
    canonicalProjectId: null,
    canonicalClientId: "client-1",
    demandClass: "tentative",
    lifecycleStatus: "proposed",
    role: "Data Engineer",
    grade: "Consultant",
    capabilityRequirements: [],
    locationConstraints: ["Remote"],
    timePhasedRequirement: [{ contourId: "tentative-demand-contour", startDate: "2026-07-07", endDate: "2026-07-07", hoursPerDay: 8 }],
    probabilityPct: 60,
    commercialExpectedValue: 1200,
    currency: "AUD",
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    demandId: "demand-weighted-1",
    canonicalOpportunityId: "opp-3",
    canonicalProjectId: null,
    canonicalClientId: "client-2",
    demandClass: "weighted_pipeline",
    lifecycleStatus: "qualified",
    role: "Platform Architect",
    grade: "Principal",
    capabilityRequirements: [],
    locationConstraints: ["AU"],
    timePhasedRequirement: [{ contourId: "weighted-demand-contour", startDate: "2026-07-06", endDate: "2026-07-08", hoursPerDay: 8 }],
    probabilityPct: 50,
    commercialExpectedValue: 6000,
    currency: "AUD",
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
];

const internalWorkCategories: InternalWorkCategory[] = [
  {
    categoryId: "practice-build",
    name: "Practice build",
    recoverability: "non_recoverable",
    fundingSource: "internal_investment",
    benchExposurePolicy: "show_as_both",
    governanceOwner: "Resource Admin",
    active: true,
  },
];

const namedAssignments: NamedAssignmentV2[] = [
  {
    assignmentId: "assignment-authorised",
    bookingId: "booking-hard-1",
    canonicalPersonId: "person-1",
    canonicalProjectId: "project-authorised",
    workClass: "client_delivery",
    internalWorkCategoryId: null,
    lifecycleStatus: "active",
    timePhasedAllocation: [{ contourId: "authorised-assignment-contour", startDate: "2026-07-06", endDate: "2026-07-07", hoursPerDay: 6 }],
    deliveryStartEvidence: [evidence],
    deliveryEndEvidence: [],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    assignmentId: "assignment-internal",
    bookingId: "booking-internal-1",
    canonicalPersonId: "person-1",
    canonicalProjectId: "project-internal",
    workClass: "governed_internal",
    internalWorkCategoryId: "practice-build",
    lifecycleStatus: "active",
    timePhasedAllocation: [{ contourId: "internal-assignment-contour", startDate: "2026-07-08", endDate: "2026-07-08", hoursPerDay: 3 }],
    deliveryStartEvidence: [evidence],
    deliveryEndEvidence: [],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    assignmentId: "assignment-risky",
    bookingId: "booking-hard-overrun",
    canonicalPersonId: "person-1",
    canonicalProjectId: "project-risky",
    workClass: "client_delivery",
    internalWorkCategoryId: null,
    lifecycleStatus: "active",
    timePhasedAllocation: [{ contourId: "risky-assignment-contour", startDate: "2026-07-08", endDate: "2026-07-08", hoursPerDay: 10 }],
    deliveryStartEvidence: [evidence],
    deliveryEndEvidence: [],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
];

const commercialAuthorities: CommercialAuthorityV2[] = [
  {
    authorityId: "authority-authorised",
    canonicalProjectId: "project-authorised",
    canonicalOpportunityId: "opp-1",
    sowStatus: "signed",
    poStatus: "received",
    financeApprovalStatus: "approved",
    authorityValidFrom: "2026-07-01",
    authorityValidTo: "2026-07-31",
    authorisedOverrideEvidence: [],
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
  {
    authorityId: "authority-risky",
    canonicalProjectId: "project-risky",
    canonicalOpportunityId: "opp-4",
    sowStatus: "unsigned_extension",
    poStatus: "missing",
    financeApprovalStatus: "pending",
    authorityValidFrom: "2026-07-01",
    authorityValidTo: null,
    authorisedOverrideEvidence: [],
    sourceEvidence: [evidence],
    schemaVersion: RESOURCE_PLANNING_SCHEMA_VERSION,
  },
];

const thresholds: ExceptionThreshold[] = [
  { thresholdId: "threshold-capacity-1", name: "Any hard-booked overrun", exceptionType: "capacity", severity: "high", limitHours: 0, active: true },
  { thresholdId: "threshold-commercial-1", name: "Commercial authority required", exceptionType: "commercial", severity: "high", active: true },
];

const input = {
  calculationId: "calc-p0-fixture",
  days,
  effectiveCapacity,
  demands,
  bookings,
  namedAssignments,
  internalWorkCategories,
  commercialAuthorities,
  thresholds,
};

assertEqual(contourHoursForDay({ contourId: "pct", startDate: "2026-07-06", endDate: "2026-07-06", allocationPct: 50 }, "2026-07-06"), 4, "Allocation percentage should convert to hours");
assertEqual(contourHoursForDay({ contourId: "weekday", startDate: "2026-07-06", endDate: "2026-07-06", hoursPerDay: 8, daysOfWeek: [2] }, "2026-07-06"), 0, "Contours should respect days-of-week filters");

const metrics = calculateResourcePlanningMetrics(input);
assertEqual(metrics.effectiveCapacityHours, 22, "Effective capacity should subtract approved leave from contractual capacity");
assertEqual(metrics.hardBookedHours, 22, "Hard-booked capacity should include only committed hard bookings");
assertEqual(metrics.softBookedHours, 12, "Soft-booked capacity should be tracked separately");
assertEqual(metrics.benchExposureHours, 2, "Bench should be residual effective capacity after hard bookings only");
assertEqual(metrics.confirmedDemandHours, 16, "Confirmed demand should remain separate from bookings and actuals");
assertEqual(metrics.tentativeDemandHours, 8, "Tentative demand should remain separate from confirmed demand");
assertEqual(metrics.weightedPipelineDemandHours, 12, "Weighted pipeline demand should multiply requirement hours by probability");
assertEqual(metrics.nonRecoverableInternalHours, 3, "Governed internal non-recoverable capacity should be visible separately");
assertEqual(metrics.commerciallyAuthorisedHours, 12, "Commercially authorised work should require SOW, PO and finance authority");
assertEqual(metrics.workUnderwayAtRiskHours, 10, "Work underway at risk should be a commercial overlay, not an allocation status");

const overlays = deriveCommercialRiskOverlays({ authorities: commercialAuthorities, days });
assertEqual(overlays.length, 2, "Commercial authority gaps should produce risk overlays");

const signals = buildAttentionSignals(input);
assert(signals.some((signal) => signal.color === "red" && signal.statusText === "Hard-booked above effective capacity"), "Capacity overrun should be a red attention signal");
assert(signals.some((signal) => signal.statusText === "Soft booking exceeds residual capacity"), "Soft booking collision should be visible without reducing bench");
assert(signals.some((signal) => signal.statusText === "Missing or expired PO"), "Missing PO should be a presentation-level attention signal");
assert(
  signals.every((signal) => signal.statusText && signal.reason && signal.recommendedAction && signal.sourceEvidence.length > 0),
  "Every attention signal should include status text, reason, source evidence and recommended action",
);

console.log("Resource planning architecture contract tests passed");
