import type { HubSpotDeal, HubSpotSnapshot, HubSpotTask } from "@/integrations/hubspot/types";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function money(amount: number | null, currency = "AUD"): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(d);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type PeriodFilter = "MONTH" | "QUARTER" | "FY" | "CALENDAR_YEAR" | "CUSTOM";
export type TargetPeriodType = "MONTH" | "QUARTER" | "YEAR";

export type Period = {
  filter: PeriodFilter;
  label: string;
  start: Date;
  end: Date;
  /** Set only for filters that map onto a storable manual target (MONTH/QUARTER/FY/CALENDAR_YEAR). */
  target: { periodType: TargetPeriodType; periodKey: string } | null;
};

function startOfDayUTC(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfDayUTC(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

/** Australian financial year: 1 Jul – 30 Jun. */
function financialYearBounds(now: Date): { start: Date; end: Date; endYear: number } {
  const year = now.getUTCFullYear();
  const startsThisCalendarYear = now.getUTCMonth() >= 6; // Jul = index 6
  const startYear = startsThisCalendarYear ? year : year - 1;
  return {
    start: new Date(Date.UTC(startYear, 6, 1)),
    end: new Date(Date.UTC(startYear + 1, 5, 30)),
    endYear: startYear + 1,
  };
}

export function resolvePeriod(
  filter: PeriodFilter,
  now: Date,
  custom?: { start: string; end: string },
): Period {
  if (filter === "MONTH") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = endOfDayUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)));
    const periodKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      filter,
      label: new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(start),
      start,
      end,
      target: { periodType: "MONTH", periodKey },
    };
  }
  if (filter === "QUARTER") {
    const q = Math.floor(now.getUTCMonth() / 3);
    const start = new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1));
    const end = endOfDayUTC(new Date(Date.UTC(now.getUTCFullYear(), q * 3 + 3, 0)));
    return {
      filter,
      label: `Q${q + 1} ${now.getUTCFullYear()}`,
      start,
      end,
      target: { periodType: "QUARTER", periodKey: `${now.getUTCFullYear()}-Q${q + 1}` },
    };
  }
  if (filter === "FY") {
    const { start, end, endYear } = financialYearBounds(now);
    return {
      filter,
      label: `FY${endYear - 1}–${String(endYear).slice(2)}`,
      start,
      end,
      target: { periodType: "YEAR", periodKey: `FY${endYear}` },
    };
  }
  if (filter === "CALENDAR_YEAR") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = endOfDayUTC(new Date(Date.UTC(now.getUTCFullYear(), 11, 31)));
    return {
      filter,
      label: `Calendar year ${now.getUTCFullYear()}`,
      start,
      end,
      target: { periodType: "YEAR", periodKey: `CY${now.getUTCFullYear()}` },
    };
  }
  // CUSTOM
  const start = custom?.start ? startOfDayUTC(new Date(custom.start)) : startOfDayUTC(now);
  const end = custom?.end ? endOfDayUTC(new Date(custom.end)) : endOfDayUTC(now);
  return {
    filter,
    label: `${formatDate(start.toISOString())} – ${formatDate(end.toISOString())}`,
    start,
    end,
    target: null,
  };
}

function withinPeriod(iso: string | null, period: Period): boolean {
  if (!iso) return false;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return d >= period.start && d <= period.end;
}

// ---------------------------------------------------------------------------
// Deal health
// ---------------------------------------------------------------------------

export type HealthLevel = "green" | "amber" | "red";

export type HealthAssessment = {
  level: HealthLevel;
  reasons: string[];
};

const STALE_AMBER_DAYS = 7;
const STAGE_AGE_AMBER_DAYS = 45;
const WEAK_NEXT_STEP_PATTERN = /^(follow up|touch base|check in|tbc|n\/a|catch up)\.?$/i;

function isWeakNextStep(text: string | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 8) return true;
  return WEAK_NEXT_STEP_PATTERN.test(trimmed);
}

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return daysBetween(new Date(iso), now);
}

export function assessDealHealth(deal: HubSpotDeal, now: Date): HealthAssessment {
  if (deal.isClosedWon || deal.isClosedLost) {
    return { level: "green", reasons: [] };
  }
  const staleDays = daysSince(deal.lastActivityAt, now);
  const closeDaysAway = deal.closeDate ? daysBetween(now, new Date(`${deal.closeDate}T00:00:00Z`)) : null;
  const stageAgeDays = deal.stageEnteredAt ? daysSince(deal.stageEnteredAt, now) : null;
  const hasNextActivity = Boolean(deal.nextActivityAt);
  const closePassed = closeDaysAway !== null && closeDaysAway < 0;

  const red: string[] = [];
  const amber: string[] = [];

  if (closePassed) {
    red.push(`Close date passed ${Math.abs(closeDaysAway ?? 0)} day${Math.abs(closeDaysAway ?? 0) === 1 ? "" : "s"} ago`);
  }
  if (staleDays === null && !hasNextActivity) {
    red.push("No activity has ever been logged and nothing is booked");
  } else if (staleDays !== null && staleDays >= 14 && !hasNextActivity) {
    red.push(`No activity for ${staleDays} days and nothing booked`);
  }
  if (deal.amount === null && (deal.probability ?? 0) >= 0.5) {
    red.push("Deal amount is missing on a late-stage opportunity");
  }
  if (deal.forecastCategory === "commit" && staleDays !== null && staleDays >= 14 && !hasNextActivity) {
    red.push("Forecast category is Commit but there is no recent engagement or booked next step");
  }
  if (!closePassed && closeDaysAway !== null && closeDaysAway <= 14 && !hasNextActivity) {
    red.push("Close date is within 14 days with no meeting booked");
  }

  if (staleDays !== null && staleDays >= STALE_AMBER_DAYS && staleDays < 14) {
    amber.push(`No activity logged for ${staleDays} days`);
  }
  if (!closePassed && closeDaysAway !== null && closeDaysAway > 14 && closeDaysAway <= 30 && !hasNextActivity) {
    amber.push("Close date is approaching with no meeting booked");
  }
  if (isWeakNextStep(deal.nextStep)) {
    amber.push(deal.nextStep ? "Next step is too vague to act on" : "Next step is blank");
  }
  if (stageAgeDays !== null && stageAgeDays > STAGE_AGE_AMBER_DAYS) {
    amber.push(`In its current stage for ${stageAgeDays} days`);
  }
  if (deal.amount === null && !red.some((r) => r.includes("amount is missing"))) {
    amber.push("Deal amount is missing");
  }
  if (!deal.forecastCategory) {
    amber.push("Forecast category is not set");
  }
  if (deal.probability === null) {
    amber.push("Stage probability is not set");
  }
  if (!deal.primaryContactId) {
    amber.push("No primary contact on file");
  }

  if (red.length > 0) return { level: "red", reasons: red.slice(0, 3) };
  if (amber.length > 0) return { level: "amber", reasons: amber.slice(0, 3) };
  return { level: "green", reasons: ["Recent engagement, a credible next step and a booked or recent activity"] };
}

export function daysInCurrentStage(deal: HubSpotDeal, now: Date): number | null {
  return deal.stageEnteredAt ? daysSince(deal.stageEnteredAt, now) : null;
}

export function weightedAmount(deal: HubSpotDeal): number | null {
  if (deal.amount === null || deal.probability === null) return null;
  return Math.round(deal.amount * deal.probability);
}

// ---------------------------------------------------------------------------
// Target & performance
// ---------------------------------------------------------------------------

export type TargetStatus = "Ahead" | "On Track" | "At Risk" | "Off Track" | "No target set";

export type PerformanceSummary = {
  target: number | null;
  closedWonRevenue: number;
  remainingRevenue: number | null;
  attainmentPct: number | null;
  weightedPipeline: number;
  openPipeline: number;
  forecastRevenue: number;
  forecastBasis: "Stage-weighted pipeline";
  pipelineCoverage: number | null;
  daysRemaining: number;
  daysTotal: number;
  requiredDailyRunRate: number | null;
  status: TargetStatus;
}

export function computePerformance(deals: HubSpotDeal[], period: Period, target: number | null, now: Date): PerformanceSummary {
  const closedWon = deals.filter((d) => d.isClosedWon && withinPeriod(d.closeDate, period));
  const closedWonRevenue = closedWon.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  const openPipeline = open.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const weightedPipeline = open.reduce((sum, d) => sum + (weightedAmount(d) ?? 0), 0);
  const forecastRevenue = closedWonRevenue + weightedPipeline;

  const remainingRevenue = target !== null ? Math.max(target - closedWonRevenue, 0) : null;
  const attainmentPct = target !== null && target > 0 ? closedWonRevenue / target : null;
  const pipelineCoverage = remainingRevenue !== null && remainingRevenue > 0 ? openPipeline / remainingRevenue : null;

  const daysTotal = Math.max(daysBetween(period.start, period.end) + 1, 1);
  const daysRemaining = Math.max(daysBetween(now, period.end), 0);
  const requiredDailyRunRate = remainingRevenue !== null && daysRemaining > 0 ? remainingRevenue / daysRemaining : remainingRevenue !== null ? remainingRevenue : null;

  let status: TargetStatus = "No target set";
  if (target !== null && target > 0) {
    const projectedRatio = forecastRevenue / target;
    if (projectedRatio >= 1.05) status = "Ahead";
    else if (projectedRatio >= 0.9) status = "On Track";
    else if (projectedRatio >= 0.6) status = "At Risk";
    else status = "Off Track";
  }

  return {
    target,
    closedWonRevenue,
    remainingRevenue,
    attainmentPct,
    weightedPipeline,
    openPipeline,
    forecastRevenue,
    forecastBasis: "Stage-weighted pipeline",
    pipelineCoverage,
    daysRemaining,
    daysTotal,
    requiredDailyRunRate,
    status,
  };
}

// ---------------------------------------------------------------------------
// Today's priorities
// ---------------------------------------------------------------------------

export type PriorityAction = {
  id: string;
  rank: number;
  subject: string;
  recommendedAction: string;
  reason: string;
  dueLabel: string;
  dealValue: number | null;
  urgency: HealthLevel;
  dealUrl: string | null;
  source: "deal" | "task";
  externalId: string;
  externalType: "DEAL" | "TASK";
};

function urgencyScore(level: HealthLevel, amount: number | null, overdueDays: number, strategic: boolean): number {
  const levelScore = level === "red" ? 100 : level === "amber" ? 40 : 0;
  const valueScore = Math.min((amount ?? 0) / 5_000, 60);
  const overdueScore = Math.max(overdueDays, 0) * 3;
  const strategicScore = strategic ? 15 : 0;
  return levelScore + valueScore + overdueScore + strategicScore;
}

export function buildTodaysPriorities(deals: HubSpotDeal[], tasks: HubSpotTask[], now: Date, max = 7): PriorityAction[] {
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  const candidates: (PriorityAction & { score: number })[] = [];

  for (const deal of open) {
    const health = assessDealHealth(deal, now);
    if (health.level === "green") continue;
    const closeDaysAway = deal.closeDate ? daysBetween(now, new Date(`${deal.closeDate}T00:00:00Z`)) : null;
    const overdueDays = closeDaysAway !== null && closeDaysAway < 0 ? Math.abs(closeDaysAway) : 0;
    const reason = health.reasons[0] ?? "Needs attention";
    const dueLabel = closeDaysAway === null
      ? "No close date set"
      : closeDaysAway < 0
        ? `${Math.abs(closeDaysAway)} day${Math.abs(closeDaysAway) === 1 ? "" : "s"} overdue`
        : `Due in ${closeDaysAway} day${closeDaysAway === 1 ? "" : "s"}`;
    candidates.push({
      id: `deal-${deal.id}`,
      rank: 0,
      subject: `${deal.companyName ?? "Unknown company"} — ${deal.name}`,
      recommendedAction: reason,
      reason: `${deal.stageLabel} · ${money(deal.amount, deal.currency)} · ${health.level === "red" ? "Critical" : "Needs attention"}`,
      dueLabel,
      dealValue: deal.amount,
      urgency: health.level,
      dealUrl: deal.dealUrl,
      source: "deal",
      externalId: deal.id,
      externalType: "DEAL",
      score: urgencyScore(health.level, deal.amount, overdueDays, deal.strategicallyImportant),
    });
  }

  for (const task of tasks) {
    if (task.isCompleted) continue;
    const dueDays = task.dueAt ? daysBetween(now, new Date(task.dueAt)) : null;
    const overdue = dueDays !== null && dueDays < 0;
    if (dueDays !== null && dueDays > 0) continue; // only surface tasks due today or overdue
    candidates.push({
      id: `task-${task.id}`,
      rank: 0,
      subject: task.title,
      recommendedAction: "Complete this HubSpot task",
      reason: overdue ? "Overdue task" : "Due today",
      dueLabel: overdue ? `${Math.abs(dueDays ?? 0)} day${Math.abs(dueDays ?? 0) === 1 ? "" : "s"} overdue` : "Due today",
      dealValue: null,
      urgency: overdue ? "red" : "amber",
      dealUrl: task.taskUrl,
      source: "task",
      externalId: task.id,
      externalType: "TASK",
      score: urgencyScore(overdue ? "red" : "amber", null, overdue ? Math.abs(dueDays ?? 0) : 0, false),
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

/** Excludes priorities the salesperson has already completed/dismissed, or snoozed into the future. */
export function filterActionedPriorities(
  priorities: PriorityAction[],
  actions: { externalId: string; externalType: string; actionType: string; snoozedUntil: Date | null }[],
  now: Date,
): PriorityAction[] {
  const hidden = new Set<string>();
  for (const action of actions) {
    const key = `${action.externalType}:${action.externalId}`;
    if (action.actionType === "COMPLETE" || action.actionType === "DISMISS") {
      hidden.add(key);
    } else if (action.actionType === "SNOOZE" && action.snoozedUntil && action.snoozedUntil > now) {
      hidden.add(key);
    }
  }
  return priorities.filter((p) => !hidden.has(`${p.externalType}:${p.externalId}`));
}

// ---------------------------------------------------------------------------
// Top deals scoring
// ---------------------------------------------------------------------------

export type DealView = "priority" | "value" | "closing_soon" | "at_risk" | "recently_inactive";

export function scoreDealPriority(deal: HubSpotDeal, now: Date): number {
  const health = assessDealHealth(deal, now);
  const closeDaysAway = deal.closeDate ? daysBetween(now, new Date(`${deal.closeDate}T00:00:00Z`)) : null;
  const valueScore = Math.log10(Math.max(deal.amount ?? 1, 1)) * 10;
  const probabilityScore = (deal.probability ?? 0.2) * 30;
  const closenessScore = closeDaysAway !== null && closeDaysAway >= 0 ? Math.max(30 - closeDaysAway, 0) : 0;
  const strategicScore = deal.strategicallyImportant ? 15 : 0;
  const riskPenalty = health.level === "red" ? 20 : health.level === "amber" ? 8 : 0;
  return valueScore + probabilityScore + closenessScore + strategicScore - riskPenalty;
}

export function sortDealsForView(deals: HubSpotDeal[], view: DealView, now: Date): HubSpotDeal[] {
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  switch (view) {
    case "value":
      return [...open].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
    case "closing_soon":
      return [...open]
        .filter((d) => d.closeDate && new Date(`${d.closeDate}T00:00:00Z`) >= now)
        .sort((a, b) => new Date(a.closeDate!).getTime() - new Date(b.closeDate!).getTime());
    case "at_risk":
      return [...open]
        .filter((d) => assessDealHealth(d, now).level !== "green")
        .sort((a, b) => {
          const la = assessDealHealth(a, now).level;
          const lb = assessDealHealth(b, now).level;
          if (la === lb) return scoreDealPriority(b, now) - scoreDealPriority(a, now);
          return la === "red" ? -1 : lb === "red" ? 1 : 0;
        });
    case "recently_inactive":
      return [...open].sort((a, b) => (daysSince(b.lastActivityAt, now) ?? 9999) - (daysSince(a.lastActivityAt, now) ?? 9999));
    case "priority":
    default:
      return [...open].sort((a, b) => scoreDealPriority(b, now) - scoreDealPriority(a, now));
  }
}

// ---------------------------------------------------------------------------
// Exceptions (deals requiring attention)
// ---------------------------------------------------------------------------

export type ExceptionBucket = "Critical" | "Needs attention" | "Monitor";

export type DealException = {
  deal: HubSpotDeal;
  bucket: ExceptionBucket;
  reasons: string[];
};

export function buildExceptions(deals: HubSpotDeal[], now: Date): DealException[] {
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  const out: DealException[] = [];
  for (const deal of open) {
    const health = assessDealHealth(deal, now);
    if (health.level === "green") continue;
    const bucket: ExceptionBucket = health.level === "red" ? "Critical" : health.reasons.length >= 2 ? "Needs attention" : "Monitor";
    out.push({ deal, bucket, reasons: health.reasons });
  }
  const order: Record<ExceptionBucket, number> = { Critical: 0, "Needs attention": 1, Monitor: 2 };
  return out.sort((a, b) => order[a.bucket] - order[b.bucket] || scoreDealPriority(b.deal, now) - scoreDealPriority(a.deal, now));
}

// ---------------------------------------------------------------------------
// Data gaps
// ---------------------------------------------------------------------------

export type DataGapCategory =
  | "Missing data"
  | "Outdated data"
  | "Inconsistent data"
  | "Stale opportunity"
  | "Missing activity"
  | "Missing stakeholder information";

export type DataGap = {
  dealId: string;
  dealName: string;
  field: string;
  category: DataGapCategory;
  why: string;
  recommendation: string;
  dealUrl: string;
};

export function buildDataGaps(deals: HubSpotDeal[], now: Date): DataGap[] {
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  const gaps: DataGap[] = [];
  for (const deal of open) {
    const push = (field: string, category: DataGapCategory, why: string, recommendation: string) =>
      gaps.push({ dealId: deal.id, dealName: deal.name, field, category, why, recommendation, dealUrl: deal.dealUrl });

    if (deal.amount === null) {
      push("Amount", "Missing data", "Deals without a value can't be forecast or weighted in pipeline coverage.", "Add the expected deal value.");
    }
    if (!deal.forecastCategory) {
      push("Forecast category", "Missing data", "Without a forecast category this deal can't be rolled into a manager forecast view.", "Set a forecast category.");
    }
    if (deal.probability === null) {
      push("Deal probability", "Missing data", "Weighted pipeline can't include this deal without a stage probability.", "Confirm the deal is on a stage with a probability configured.");
    }
    if (!deal.primaryContactId) {
      push("Primary contact", "Missing stakeholder information", "There's no contact on file, so it's unclear who the deal is being progressed with.", "Associate the key contact you're dealing with.");
    }
    if (deal.closeDate && daysBetween(now, new Date(`${deal.closeDate}T00:00:00Z`)) < 0) {
      push("Close date", "Outdated data", "The close date has passed but the deal is still open.", "Update the close date to reflect the realistic next milestone.");
    }
    if (isWeakNextStep(deal.nextStep)) {
      push("Next step", "Missing data", "A missing or vague next step makes it hard to know what to do next.", "Record a specific, dated next step.");
    }
    if (!deal.nextActivityAt) {
      push("Next activity", "Missing activity", "No future call, email or meeting is booked on this deal.", "Book the next customer or internal touchpoint.");
    }
    const staleDays = daysSince(deal.lastActivityAt, now);
    if (staleDays !== null && staleDays >= STALE_AMBER_DAYS) {
      push("Last activity", "Stale opportunity", `No logged activity for ${staleDays} days.`, "Log the most recent interaction, or re-engage the account.");
    }
    if (deal.forecastCategory === "commit" && (deal.probability ?? 0) < 0.5) {
      push("Forecast category", "Inconsistent data", "Forecast category is Commit but the deal is still in an early stage.", "Reconcile the forecast category with the actual stage/probability.");
    }
  }
  return gaps;
}

export type DataQualitySummary = {
  completenessScore: number;
  openDealCount: number;
  missingCriticalFieldCount: number;
  staleOpportunityCount: number;
  overdueCloseDateCount: number;
  noNextStepCount: number;
  noFutureActivityCount: number;
  gaps: DataGap[];
};

export function buildDataQualitySummary(deals: HubSpotDeal[], now: Date): DataQualitySummary {
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  const gaps = buildDataGaps(deals, now);
  const criticalFields = ["Amount", "Forecast category", "Deal probability"];
  const missingCriticalFieldCount = new Set(gaps.filter((g) => criticalFields.includes(g.field)).map((g) => g.dealId)).size;
  const staleOpportunityCount = new Set(gaps.filter((g) => g.category === "Stale opportunity").map((g) => g.dealId)).size;
  const overdueCloseDateCount = new Set(gaps.filter((g) => g.category === "Outdated data").map((g) => g.dealId)).size;
  const noNextStepCount = open.filter((d) => isWeakNextStep(d.nextStep)).length;
  const noFutureActivityCount = open.filter((d) => !d.nextActivityAt).length;

  const checkedFieldsPerDeal = 5; // amount, forecastCategory, probability, next step, primary contact
  const totalChecks = Math.max(open.length * checkedFieldsPerDeal, 1);
  const failedChecks = open.reduce((sum, d) => {
    let fails = 0;
    if (d.amount === null) fails += 1;
    if (!d.forecastCategory) fails += 1;
    if (d.probability === null) fails += 1;
    if (isWeakNextStep(d.nextStep)) fails += 1;
    if (!d.primaryContactId) fails += 1;
    return sum + fails;
  }, 0);
  const completenessScore = Math.round((1 - failedChecks / totalChecks) * 100);

  return {
    completenessScore,
    openDealCount: open.length,
    missingCriticalFieldCount,
    staleOpportunityCount,
    overdueCloseDateCount,
    noNextStepCount,
    noFutureActivityCount,
    gaps,
  };
}

// ---------------------------------------------------------------------------
// Contact & company data hygiene
// ---------------------------------------------------------------------------

export type ContactCompanyGapCategory = "Missing contact detail" | "Missing company detail";

export type ContactCompanyGap = {
  recordType: "contact" | "company";
  recordId: string;
  recordName: string;
  field: string;
  category: ContactCompanyGapCategory;
  why: string;
  recommendation: string;
  recordUrl: string;
};

export type ContactCompanyHygiene = {
  contactCount: number;
  companyCount: number;
  contactsMissingEmail: number;
  contactsMissingJobTitle: number;
  companiesMissingDomain: number;
  companiesMissingIndustry: number;
  gaps: ContactCompanyGap[];
};

export function buildContactCompanyHygiene(snapshot: HubSpotSnapshot): ContactCompanyHygiene {
  const gaps: ContactCompanyGap[] = [];

  for (const contact of snapshot.contacts) {
    if (!contact.email) {
      gaps.push({
        recordType: "contact",
        recordId: contact.id,
        recordName: contact.fullName,
        field: "Email",
        category: "Missing contact detail",
        why: "No email on file — this contact can't be reached electronically or matched against marketing activity.",
        recommendation: "Add an email address for this contact.",
        recordUrl: contact.contactUrl,
      });
    }
    if (!contact.jobTitle) {
      gaps.push({
        recordType: "contact",
        recordId: contact.id,
        recordName: contact.fullName,
        field: "Job title",
        category: "Missing contact detail",
        why: "Without a job title it's hard to judge seniority or decision-making authority.",
        recommendation: "Record this contact's job title.",
        recordUrl: contact.contactUrl,
      });
    }
  }

  for (const company of snapshot.companies) {
    if (!company.domain) {
      gaps.push({
        recordType: "company",
        recordId: company.id,
        recordName: company.name,
        field: "Domain",
        category: "Missing company detail",
        why: "No domain on file — harder to enrich, de-duplicate or match this company to future leads.",
        recommendation: "Add the company's website domain.",
        recordUrl: company.companyUrl,
      });
    }
    if (!company.industry) {
      gaps.push({
        recordType: "company",
        recordId: company.id,
        recordName: company.name,
        field: "Industry",
        category: "Missing company detail",
        why: "Missing industry limits segmentation, targeting and pipeline reporting by sector.",
        recommendation: "Set this company's industry.",
        recordUrl: company.companyUrl,
      });
    }
  }

  return {
    contactCount: snapshot.contacts.length,
    companyCount: snapshot.companies.length,
    contactsMissingEmail: snapshot.contacts.filter((c) => !c.email).length,
    contactsMissingJobTitle: snapshot.contacts.filter((c) => !c.jobTitle).length,
    companiesMissingDomain: snapshot.companies.filter((c) => !c.domain).length,
    companiesMissingIndustry: snapshot.companies.filter((c) => !c.industry).length,
    gaps,
  };
}

// ---------------------------------------------------------------------------
// Pipeline overview
// ---------------------------------------------------------------------------

export type StageSummary = { stage: string; label: string; count: number; amount: number; weighted: number };
export type MonthSummary = { monthKey: string; label: string; amount: number; weighted: number; count: number };

export type PipelineOverview = {
  byStage: StageSummary[];
  byCloseMonth: MonthSummary[];
  totalOpenAmount: number;
  totalWeightedAmount: number;
  newOpportunitiesInPeriod: number;
  closedWonInPeriod: { count: number; amount: number };
  closedLostInPeriod: { count: number; amount: number };
  avgClosedWonDealValue: number | null;
  avgSalesCycleDays: number | null;
};

export function buildPipelineOverview(deals: HubSpotDeal[], period: Period): PipelineOverview {
  const open = deals.filter((d) => !d.isClosedWon && !d.isClosedLost);
  const stageMap = new Map<string, StageSummary>();
  for (const deal of open) {
    const key = deal.stage;
    const existing = stageMap.get(key) ?? { stage: key, label: deal.stageLabel, count: 0, amount: 0, weighted: 0 };
    existing.count += 1;
    existing.amount += deal.amount ?? 0;
    existing.weighted += weightedAmount(deal) ?? 0;
    stageMap.set(key, existing);
  }

  const monthMap = new Map<string, MonthSummary>();
  for (const deal of open) {
    if (!deal.closeDate) continue;
    const d = new Date(`${deal.closeDate}T00:00:00Z`);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key) ?? {
      monthKey: key,
      label: new Intl.DateTimeFormat("en-AU", { month: "short", year: "numeric", timeZone: "UTC" }).format(d),
      amount: 0,
      weighted: 0,
      count: 0,
    };
    existing.count += 1;
    existing.amount += deal.amount ?? 0;
    existing.weighted += weightedAmount(deal) ?? 0;
    monthMap.set(key, existing);
  }

  const newOpportunitiesInPeriod = deals.filter((d) => withinPeriod(d.createdAt, period)).length;
  const closedWon = deals.filter((d) => d.isClosedWon && withinPeriod(d.closeDate, period));
  const closedLost = deals.filter((d) => d.isClosedLost && withinPeriod(d.closeDate, period));

  const cycleDays = closedWon
    .map((d) => (d.closeDate ? daysBetween(new Date(d.createdAt), new Date(`${d.closeDate}T00:00:00Z`)) : null))
    .filter((v): v is number => v !== null);

  return {
    byStage: [...stageMap.values()],
    byCloseMonth: [...monthMap.values()].sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    totalOpenAmount: open.reduce((s, d) => s + (d.amount ?? 0), 0),
    totalWeightedAmount: open.reduce((s, d) => s + (weightedAmount(d) ?? 0), 0),
    newOpportunitiesInPeriod,
    closedWonInPeriod: { count: closedWon.length, amount: closedWon.reduce((s, d) => s + (d.amount ?? 0), 0) },
    closedLostInPeriod: { count: closedLost.length, amount: closedLost.reduce((s, d) => s + (d.amount ?? 0), 0) },
    avgClosedWonDealValue: closedWon.length > 0 ? closedWon.reduce((s, d) => s + (d.amount ?? 0), 0) / closedWon.length : null,
    avgSalesCycleDays: cycleDays.length > 0 ? Math.round(cycleDays.reduce((s, v) => s + v, 0) / cycleDays.length) : null,
  };
}

// ---------------------------------------------------------------------------
// "What matters today" summary (rule-based, not a live model call)
// ---------------------------------------------------------------------------

export function buildWhatMattersToday(
  priorities: PriorityAction[],
  performance: PerformanceSummary,
  dataQuality: DataQualitySummary,
): string[] {
  const lines: string[] = [];
  const top = priorities[0];
  if (top) {
    lines.push(`${top.subject} is your highest-priority action — ${top.recommendedAction.toLowerCase()}.`);
  } else {
    lines.push("No urgent deal actions right now — your open pipeline looks healthy.");
  }

  if (performance.target !== null && performance.target > 0) {
    const pct = Math.round((performance.attainmentPct ?? 0) * 100);
    lines.push(`You're tracking as "${performance.status}" at ${pct}% of target, with ${money(performance.remainingRevenue)} still required.`);
  } else {
    lines.push("No sales target is set for this period yet — add one in the performance card below.");
  }

  if (dataQuality.missingCriticalFieldCount > 0 || dataQuality.overdueCloseDateCount > 0) {
    lines.push(
      `${dataQuality.missingCriticalFieldCount} open deal${dataQuality.missingCriticalFieldCount === 1 ? "" : "s"} ${dataQuality.missingCriticalFieldCount === 1 ? "is" : "are"} missing a critical field and ${dataQuality.overdueCloseDateCount} have a close date in the past — worth a quick clean-up.`,
    );
  } else {
    lines.push("No major HubSpot data-quality issues detected in your open pipeline.");
  }

  return lines.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Full view model — glues the sections above together for the page/client.
// ---------------------------------------------------------------------------

export type SalesCommandCentreViewModel = {
  dataSource: "demo" | "live";
  fetchedAt: string;
  period: Period;
  performance: PerformanceSummary;
  priorities: PriorityAction[];
  exceptions: DealException[];
  dataQuality: DataQualitySummary;
  contactCompanyHygiene: ContactCompanyHygiene;
  pipeline: PipelineOverview;
  whatMattersToday: string[];
  openDealCount: number;
  closedWonCount: number;
  closedLostCount: number;
  recentEngagementsCount: number;
  upcomingActivitiesCount: number;
  overdueTaskCount: number;
};

export function buildSalesCommandCentreViewModel(
  snapshot: HubSpotSnapshot,
  period: Period,
  target: number | null,
  now: Date,
  activityActions: { externalId: string; externalType: string; actionType: string; snoozedUntil: Date | null }[] = [],
): SalesCommandCentreViewModel {
  const performance = computePerformance(snapshot.deals, period, target, now);
  const priorities = filterActionedPriorities(buildTodaysPriorities(snapshot.deals, snapshot.tasks, now), activityActions, now);
  const exceptions = buildExceptions(snapshot.deals, now);
  const dataQuality = buildDataQualitySummary(snapshot.deals, now);
  const contactCompanyHygiene = buildContactCompanyHygiene(snapshot);
  const pipeline = buildPipelineOverview(snapshot.deals, period);
  const whatMattersToday = buildWhatMattersToday(priorities, performance, dataQuality);

  const recentEngagementsCount = snapshot.engagements.filter((e) => {
    const days = daysSince(e.occurredAt, now);
    return days !== null && days >= 0 && days <= 14;
  }).length;
  const upcomingActivitiesCount = snapshot.deals.filter((d) => {
    if (!d.nextActivityAt) return false;
    const days = daysBetween(now, new Date(d.nextActivityAt));
    return days >= 0 && days <= 14;
  }).length;
  const overdueTaskCount = snapshot.tasks.filter((t) => !t.isCompleted && t.dueAt && daysBetween(now, new Date(t.dueAt)) < 0).length;

  return {
    dataSource: snapshot.dataSource,
    fetchedAt: snapshot.fetchedAt,
    period,
    performance,
    priorities,
    exceptions,
    dataQuality,
    contactCompanyHygiene,
    pipeline,
    whatMattersToday,
    openDealCount: snapshot.deals.filter((d) => !d.isClosedWon && !d.isClosedLost).length,
    closedWonCount: snapshot.deals.filter((d) => d.isClosedWon).length,
    closedLostCount: snapshot.deals.filter((d) => d.isClosedLost).length,
    recentEngagementsCount,
    upcomingActivitiesCount,
    overdueTaskCount,
  };
}
