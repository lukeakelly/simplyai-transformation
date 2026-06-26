import type {
  AllocationContour,
  AttentionSignal,
  BookingV2,
  CommercialAuthorityV2,
  CommercialRiskOverlayV2,
  EffectiveCapacityDay,
  ExceptionThreshold,
  InternalWorkCategory,
  NamedAssignmentV2,
  ResourceDemandV2,
} from "@/lib/resource-planning-domain";

const fteDayHours = 8;
const activeBookingStatuses = new Set<BookingV2["lifecycleStatus"]>(["proposed", "held", "requested", "approved", "committed"]);
const hardBookingStatuses = new Set<BookingV2["lifecycleStatus"]>(["approved", "committed"]);
const activeAssignmentStatuses = new Set<NamedAssignmentV2["lifecycleStatus"]>(["planned", "active"]);

export type ResourcePlanningMetrics = {
  calculationId: string;
  effectiveCapacityHours: number;
  hardBookedHours: number;
  softBookedHours: number;
  benchExposureHours: number;
  nonRecoverableInternalHours: number;
  confirmedDemandHours: number;
  tentativeDemandHours: number;
  weightedPipelineDemandHours: number;
  commerciallyAuthorisedHours: number;
  workUnderwayAtRiskHours: number;
};

export type ResourcePlanningProjectionInput = {
  calculationId: string;
  days: string[];
  effectiveCapacity: EffectiveCapacityDay[];
  demands: ResourceDemandV2[];
  bookings: BookingV2[];
  namedAssignments: NamedAssignmentV2[];
  internalWorkCategories: InternalWorkCategory[];
  commercialAuthorities: CommercialAuthorityV2[];
  thresholds: ExceptionThreshold[];
};

function parseUtcDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function dayOfWeek(day: string) {
  return parseUtcDate(day).getUTCDay();
}

function dateInRange(day: string, contour: AllocationContour) {
  return day >= contour.startDate && day <= contour.endDate;
}

export function contourHoursForDay(contour: AllocationContour, day: string) {
  if (!dateInRange(day, contour)) return 0;
  if (contour.daysOfWeek && !contour.daysOfWeek.includes(dayOfWeek(day))) return 0;
  if (typeof contour.hoursPerDay === "number") return contour.hoursPerDay;
  if (typeof contour.fte === "number") return contour.fte * fteDayHours;
  if (typeof contour.allocationPct === "number") return (contour.allocationPct / 100) * fteDayHours;
  return 0;
}

function contourHours(contours: AllocationContour[], day: string) {
  return contours.reduce((total, contour) => total + contourHoursForDay(contour, day), 0);
}

function effectiveHours(capacityDay: EffectiveCapacityDay) {
  return Math.max(0, capacityDay.contractualHours - capacityDay.approvedLeaveHours - capacityDay.publicHolidayHours - capacityDay.inactiveHours);
}

function bookingHours(booking: BookingV2, day: string) {
  if (!activeBookingStatuses.has(booking.lifecycleStatus)) return 0;
  return contourHours(booking.timePhasedBooking, day);
}

function hardBookingHours(booking: BookingV2, day: string) {
  if (booking.bookingStrength !== "hard" || !hardBookingStatuses.has(booking.lifecycleStatus)) return 0;
  return contourHours(booking.timePhasedBooking, day);
}

function softBookingHours(booking: BookingV2, day: string) {
  if (booking.bookingStrength !== "soft") return 0;
  return bookingHours(booking, day);
}

function demandHours(demand: ResourceDemandV2, day: string) {
  return contourHours(demand.timePhasedRequirement, day);
}

function assignmentHours(assignment: NamedAssignmentV2, day: string) {
  if (!activeAssignmentStatuses.has(assignment.lifecycleStatus)) return 0;
  return contourHours(assignment.timePhasedAllocation, day);
}

function authorityIsValid(authority: CommercialAuthorityV2, day: string) {
  const insideAuthorityWindow = day >= authority.authorityValidFrom && (!authority.authorityValidTo || day <= authority.authorityValidTo);
  if (!insideAuthorityWindow) return false;
  const sowAuthorised = authority.sowStatus === "signed" || authority.sowStatus === "not_required" || authority.authorisedOverrideEvidence.length > 0;
  const poAuthorised = authority.poStatus === "received" || authority.poStatus === "not_required" || authority.authorisedOverrideEvidence.length > 0;
  const financeAuthorised = authority.financeApprovalStatus === "approved" || authority.financeApprovalStatus === "not_required";
  return sowAuthorised && poAuthorised && financeAuthorised;
}

function authorityHasCommercialRisk(authority: CommercialAuthorityV2) {
  return authority.sowStatus === "draft" || authority.sowStatus === "issued" || authority.sowStatus === "expired" || authority.sowStatus === "unsigned_extension" || authority.poStatus === "requested" || authority.poStatus === "missing" || authority.poStatus === "expired" || authority.financeApprovalStatus === "pending" || authority.financeApprovalStatus === "rejected";
}

export function deriveCommercialRiskOverlays(input: { authorities: CommercialAuthorityV2[]; days: string[] }): CommercialRiskOverlayV2[] {
  return input.authorities.flatMap((authority) => {
    const inWindow = input.days.some((day) => day >= authority.authorityValidFrom && (!authority.authorityValidTo || day <= authority.authorityValidTo));
    if (!inWindow || !authorityHasCommercialRisk(authority)) return [];
    const overlays: CommercialRiskOverlayV2[] = [];
    if (authority.poStatus === "missing" || authority.poStatus === "expired") {
      overlays.push({
        overlayId: `${authority.authorityId}-po-risk`,
        overlayType: "missing_po_for_hard_booked_work",
        canonicalProjectId: authority.canonicalProjectId,
        severity: "high",
        statusText: "Missing or expired PO",
        reason: "Commercial authority is not complete for work that may be booked or underway.",
        sourceEvidence: authority.sourceEvidence,
        recommendedAction: "Obtain PO or record an authorised commercial override before confirming additional hard-booked work.",
        schemaVersion: authority.schemaVersion,
      });
    }
    if (authority.sowStatus === "draft" || authority.sowStatus === "issued" || authority.sowStatus === "expired") {
      overlays.push({
        overlayId: `${authority.authorityId}-sow-risk`,
        overlayType: "unsigned_sow_for_confirmed_demand",
        canonicalProjectId: authority.canonicalProjectId,
        severity: "high",
        statusText: "SOW not signed",
        reason: "Demand or delivery exists without signed SOW authority.",
        sourceEvidence: authority.sourceEvidence,
        recommendedAction: "Confirm SOW signature or move the work back to tentative demand.",
        schemaVersion: authority.schemaVersion,
      });
    }
    if (authority.sowStatus === "unsigned_extension") {
      overlays.push({
        overlayId: `${authority.authorityId}-extension-risk`,
        overlayType: "unsigned_extension_inside_threshold",
        canonicalProjectId: authority.canonicalProjectId,
        severity: "medium",
        statusText: "Extension unsigned",
        reason: "Work extends beyond the currently signed authority window.",
        sourceEvidence: authority.sourceEvidence,
        recommendedAction: "Secure the extension or shorten the hard-booked range.",
        schemaVersion: authority.schemaVersion,
      });
    }
    return overlays;
  });
}

export function calculateResourcePlanningMetrics(input: ResourcePlanningProjectionInput): ResourcePlanningMetrics {
  let effectiveCapacityHours = 0;
  let hardBookedHours = 0;
  let softBookedHours = 0;
  let benchExposureHours = 0;
  let nonRecoverableInternalHours = 0;
  let confirmedDemandHours = 0;
  let tentativeDemandHours = 0;
  let weightedPipelineDemandHours = 0;
  let commerciallyAuthorisedHours = 0;
  let workUnderwayAtRiskHours = 0;

  for (const day of input.days) {
    for (const capacityDay of input.effectiveCapacity.filter((item) => item.date === day)) {
      const personEffectiveHours = effectiveHours(capacityDay);
      const personHardHours = input.bookings
        .filter((booking) => booking.canonicalPersonId === capacityDay.canonicalPersonId)
        .reduce((total, booking) => total + hardBookingHours(booking, day), 0);
      const personSoftHours = input.bookings
        .filter((booking) => booking.canonicalPersonId === capacityDay.canonicalPersonId)
        .reduce((total, booking) => total + softBookingHours(booking, day), 0);

      effectiveCapacityHours += personEffectiveHours;
      hardBookedHours += personHardHours;
      softBookedHours += personSoftHours;
      benchExposureHours += Math.max(0, personEffectiveHours - personHardHours);
    }

    for (const demand of input.demands) {
      const hours = demandHours(demand, day);
      if (demand.demandClass === "confirmed") confirmedDemandHours += hours;
      if (demand.demandClass === "tentative") tentativeDemandHours += hours;
      if (demand.demandClass === "weighted_pipeline") weightedPipelineDemandHours += hours * (demand.probabilityPct / 100);
    }

    for (const assignment of input.namedAssignments) {
      const hours = assignmentHours(assignment, day);
      const internalCategory = assignment.internalWorkCategoryId
        ? input.internalWorkCategories.find((category) => category.categoryId === assignment.internalWorkCategoryId)
        : null;
      if (internalCategory?.recoverability === "non_recoverable") nonRecoverableInternalHours += hours;

      const authority = input.commercialAuthorities.find((item) => item.canonicalProjectId === assignment.canonicalProjectId);
      if (authority && authorityIsValid(authority, day)) commerciallyAuthorisedHours += hours;
      if (authority && authorityHasCommercialRisk(authority)) workUnderwayAtRiskHours += hours;
    }
  }

  return {
    calculationId: input.calculationId,
    effectiveCapacityHours,
    hardBookedHours,
    softBookedHours,
    benchExposureHours,
    nonRecoverableInternalHours,
    confirmedDemandHours,
    tentativeDemandHours,
    weightedPipelineDemandHours,
    commerciallyAuthorisedHours,
    workUnderwayAtRiskHours,
  };
}

export function buildAttentionSignals(input: ResourcePlanningProjectionInput): AttentionSignal[] {
  const signals: AttentionSignal[] = [];
  const capacityThreshold = input.thresholds.find((threshold) => threshold.active && threshold.exceptionType === "capacity" && typeof threshold.limitHours === "number");
  const commercialThreshold = input.thresholds.find((threshold) => threshold.active && threshold.exceptionType === "commercial");

  for (const day of input.days) {
    for (const capacityDay of input.effectiveCapacity.filter((item) => item.date === day)) {
      const personEffectiveHours = effectiveHours(capacityDay);
      const personHardHours = input.bookings
        .filter((booking) => booking.canonicalPersonId === capacityDay.canonicalPersonId)
        .reduce((total, booking) => total + hardBookingHours(booking, day), 0);
      const personSoftHours = input.bookings
        .filter((booking) => booking.canonicalPersonId === capacityDay.canonicalPersonId)
        .reduce((total, booking) => total + softBookingHours(booking, day), 0);
      const residualAfterHard = Math.max(0, personEffectiveHours - personHardHours);

      if (capacityThreshold?.limitHours !== undefined && personHardHours - personEffectiveHours > capacityThreshold.limitHours) {
        signals.push({
          signalId: `${capacityDay.canonicalPersonId}-${day}-hard-capacity`,
          color: "red",
          statusText: "Hard-booked above effective capacity",
          reason: `${personHardHours}h hard booked against ${personEffectiveHours}h effective capacity.`,
          sourceEvidence: capacityDay.sourceEvidence,
          recommendedAction: "Reduce hard bookings, move work to another person, or approve an explicit override.",
          thresholdId: capacityThreshold.thresholdId,
        });
      } else if (personSoftHours > residualAfterHard) {
        signals.push({
          signalId: `${capacityDay.canonicalPersonId}-${day}-soft-collision`,
          color: "amber",
          statusText: "Soft booking exceeds residual capacity",
          reason: `${personSoftHours}h soft booked against ${residualAfterHard}h residual capacity after hard bookings.`,
          sourceEvidence: capacityDay.sourceEvidence,
          recommendedAction: "Review soft holds before converting any of them to hard bookings.",
        });
      }
    }
  }

  if (commercialThreshold) {
    const overlays = deriveCommercialRiskOverlays({ authorities: input.commercialAuthorities, days: input.days });
    for (const overlay of overlays) {
      signals.push({
        signalId: overlay.overlayId,
        color: overlay.severity === "critical" || overlay.severity === "high" ? "red" : "amber",
        statusText: overlay.statusText,
        reason: overlay.reason,
        sourceEvidence: overlay.sourceEvidence,
        recommendedAction: overlay.recommendedAction,
        thresholdId: commercialThreshold.thresholdId,
      });
    }
  }

  return signals;
}
