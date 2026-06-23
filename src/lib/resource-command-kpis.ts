import type { MLVizzFinancialActual, MLVizzTimesheetActual } from "@/integrations/mlvizz/contracts";
import { addDays, businessDays, overlaps, type ResourceAssignment, type ResourceDemand, type ResourcePerson } from "@/lib/resource-command-data";

const fteDayHours = 8;
const deliveryTypes = new Set<ResourceAssignment["type"]>(["Billable", "Managed Service"]);
const activeStatuses = new Set<ResourceAssignment["status"]>(["Confirmed", "Tentative", "Requested", "At Risk"]);
const committedStatuses = new Set<ResourceAssignment["status"]>(["Confirmed", "At Risk"]);
const tentativeStatuses = new Set<ResourceAssignment["status"]>(["Tentative"]);
const requestedStatuses = new Set<ResourceAssignment["status"]>(["Requested"]);
const activeDemandStatuses = new Set<ResourceDemand["status"]>(["Qualified", "Proposed"]);

export type ResourceDashboardKpis = {
  windowBusinessDays: number;
  grossCapacityHours: number;
  availableHours: number;
  availabilityPct: number;
  leaveHours: number;
  committedDeliveryHours: number;
  tentativeDeliveryHours: number;
  requestedDeliveryHours: number;
  scheduledHours: number;
  utilisationPct: number;
  tentativePct: number;
  requestedPct: number;
  pipelineWeightedHours: number;
  pipelineWeightedPersonDays: number;
  pipelineCapacityPct: number;
  overAllocatedHours: number;
  overAllocatedPersonDays: number;
  benchHours: number;
  benchPersonDays: number;
  endingSoon: number;
  submittedTimesheetHours: number;
  approvedTimesheetHours: number;
  invoicedRevenue: number;
  paidRevenue: number;
};

function allocationHours(person: ResourcePerson, allocationPct: number) {
  return person.dailyCapacityHours * (allocationPct / 100);
}

function demandBusinessDays(demand: ResourceDemand, days: string[]) {
  return days.filter((day) => day >= demand.start && day <= demand.end).length;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function fteDays(hours: number) {
  return hours / fteDayHours;
}

export function formatFteDays(hours: number) {
  return `${roundOneDecimal(fteDays(hours))}d`;
}

export function buildResourceDashboardKpis(input: {
  today: string;
  people: ResourcePerson[];
  assignments: ResourceAssignment[];
  demands: ResourceDemand[];
  timesheetActuals: MLVizzTimesheetActual[];
  financialActuals: MLVizzFinancialActual[];
  windowBusinessDays?: number;
}): ResourceDashboardKpis {
  const days = businessDays(input.today, input.windowBusinessDays ?? 30);
  let availableHours = 0;
  let grossCapacityHours = 0;
  let leaveHours = 0;
  let committedDeliveryHours = 0;
  let tentativeDeliveryHours = 0;
  let requestedDeliveryHours = 0;
  let scheduledHours = 0;
  let overAllocatedHours = 0;
  let overAllocatedPersonDays = 0;
  let benchHours = 0;

  for (const person of input.people) {
    for (const day of days) {
      const leaveForDay = input.assignments
        .filter((assignment) => assignment.personId === person.id && assignment.type === "Leave" && overlaps(day, assignment))
        .reduce((total, assignment) => total + allocationHours(person, assignment.allocationPct), 0);
      const availableForDay = Math.max(0, person.dailyCapacityHours - leaveForDay);
      const assignmentsForDay = input.assignments.filter((assignment) => assignment.personId === person.id && overlaps(day, assignment));
      const scheduledForDay = assignmentsForDay
        .filter((assignment) => activeStatuses.has(assignment.status) && assignment.type !== "Leave" && assignment.type !== "Bench")
        .reduce((total, assignment) => total + allocationHours(person, assignment.allocationPct), 0);

      grossCapacityHours += person.dailyCapacityHours;
      availableHours += availableForDay;
      leaveHours += Math.min(leaveForDay, person.dailyCapacityHours);
      scheduledHours += scheduledForDay;
      overAllocatedHours += Math.max(0, scheduledForDay - availableForDay);
      if (scheduledForDay > availableForDay) overAllocatedPersonDays += 1;
      benchHours += Math.max(0, availableForDay - scheduledForDay);

      for (const assignment of assignmentsForDay) {
        if (!deliveryTypes.has(assignment.type)) continue;
        const hours = allocationHours(person, assignment.allocationPct);
        if (committedStatuses.has(assignment.status)) committedDeliveryHours += hours;
        if (tentativeStatuses.has(assignment.status)) tentativeDeliveryHours += hours;
        if (requestedStatuses.has(assignment.status)) requestedDeliveryHours += hours;
      }
    }
  }

  const pipelineWeightedHours = input.demands
    .filter((demand) => activeDemandStatuses.has(demand.status))
    .reduce((total, demand) => total + demandBusinessDays(demand, days) * fteDayHours * (demand.allocationPct / 100) * (demand.confidence / 100), 0);
  const endingSoon = input.assignments.filter((assignment) => {
    if (!assignment.personId || assignment.type === "Leave" || assignment.type === "Bench") return false;
    if (!committedStatuses.has(assignment.status) && !tentativeStatuses.has(assignment.status)) return false;
    return assignment.end >= input.today && assignment.end <= addDays(input.today, 21);
  }).length;
  const submittedTimesheetHours = input.timesheetActuals.reduce((total, item) => total + item.submittedHours, 0);
  const approvedTimesheetHours = input.timesheetActuals.reduce((total, item) => total + item.approvedHours, 0);
  const invoicedRevenue = input.financialActuals.reduce((total, item) => total + item.netAmount, 0);
  const paidRevenue = input.financialActuals.reduce((total, item) => total + item.paidAmount, 0);

  return {
    windowBusinessDays: days.length,
    grossCapacityHours: roundOneDecimal(grossCapacityHours),
    availableHours: roundOneDecimal(availableHours),
    availabilityPct: grossCapacityHours === 0 ? 0 : Math.round((availableHours / grossCapacityHours) * 100),
    leaveHours: roundOneDecimal(leaveHours),
    committedDeliveryHours: roundOneDecimal(committedDeliveryHours),
    tentativeDeliveryHours: roundOneDecimal(tentativeDeliveryHours),
    requestedDeliveryHours: roundOneDecimal(requestedDeliveryHours),
    scheduledHours: roundOneDecimal(scheduledHours),
    utilisationPct: availableHours === 0 ? 0 : Math.round((committedDeliveryHours / availableHours) * 100),
    tentativePct: availableHours === 0 ? 0 : Math.round((tentativeDeliveryHours / availableHours) * 100),
    requestedPct: availableHours === 0 ? 0 : Math.round((requestedDeliveryHours / availableHours) * 100),
    pipelineWeightedHours: roundOneDecimal(pipelineWeightedHours),
    pipelineWeightedPersonDays: roundOneDecimal(fteDays(pipelineWeightedHours)),
    pipelineCapacityPct: availableHours === 0 ? 0 : Math.round((pipelineWeightedHours / availableHours) * 100),
    overAllocatedHours: roundOneDecimal(overAllocatedHours),
    overAllocatedPersonDays,
    benchHours: roundOneDecimal(benchHours),
    benchPersonDays: roundOneDecimal(fteDays(benchHours)),
    endingSoon,
    submittedTimesheetHours: roundOneDecimal(submittedTimesheetHours),
    approvedTimesheetHours: roundOneDecimal(approvedTimesheetHours),
    invoicedRevenue,
    paidRevenue,
  };
}
