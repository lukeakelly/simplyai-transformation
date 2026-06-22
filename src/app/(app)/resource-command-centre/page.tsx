import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resourceAssignments, type ResourceAssignment } from "@/lib/resource-command-data";
import { ResourceCommandCentreClient } from "./ResourceCommandCentreClient";

export const dynamic = "force-dynamic";

function jsonObject(value: Prisma.JsonValue): Prisma.JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function jsonString(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : null;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toOperationalAssignment(record: {
  canonicalAllocationId: string;
  canonicalPersonId: string | null;
  canonicalProjectId: string;
  status: string;
  allocationType: string;
  role: string;
  startDate: Date;
  endDate: Date;
  allocationPct: number;
  confidencePct: number;
  payload: Prisma.JsonValue;
}): ResourceAssignment | null {
  const payload = jsonObject(record.payload);
  if (jsonString(payload?.sourceOfTruth) !== "resource-app") return null;
  return {
    id: record.canonicalAllocationId,
    personId: record.canonicalPersonId,
    projectId: record.canonicalProjectId,
    type: record.allocationType as ResourceAssignment["type"],
    status: record.status as ResourceAssignment["status"],
    role: record.role,
    start: formatDate(record.startDate),
    end: formatDate(record.endDate),
    allocationPct: record.allocationPct,
    confidence: record.confidencePct,
    source: jsonString(payload?.eventLabel) ?? "Application planning save",
    notes: "Saved in the local resource planning database.",
  };
}

export default async function ResourceCommandCentrePage() {
  const operationalRecords = await prisma.resourcePlannedAllocation.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const operationalAssignments = operationalRecords
    .map(toOperationalAssignment)
    .filter((assignment): assignment is ResourceAssignment => assignment !== null);
  const operationalIds = new Set(operationalAssignments.map((assignment) => assignment.id));
  const initialAssignments = [
    ...operationalAssignments,
    ...resourceAssignments.filter((assignment) => !operationalIds.has(assignment.id)),
  ];
  return <ResourceCommandCentreClient initialAssignments={initialAssignments} />;
}
