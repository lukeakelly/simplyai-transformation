import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resourceAssignments, type ResourceAllocationHistoryEntry, type ResourceAssignment, type ResourceComment } from "@/lib/resource-command-data";
import { ResourceCommandCentreClient } from "./ResourceCommandCentreClient";

export const dynamic = "force-dynamic";

function jsonObject(value: Prisma.JsonValue): Prisma.JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function jsonString(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : null;
}

function jsonNumber(value: Prisma.JsonValue | undefined) {
  return typeof value === "number" ? value : null;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toHistoryAssignment(value: Prisma.JsonValue): ResourceAssignment | null {
  const payload = jsonObject(value);
  if (!payload) return null;
  const id = jsonString(payload.id);
  const projectId = jsonString(payload.projectId);
  const type = jsonString(payload.type);
  const status = jsonString(payload.status);
  const role = jsonString(payload.role);
  const start = jsonString(payload.start);
  const end = jsonString(payload.end);
  const allocationPct = jsonNumber(payload.allocationPct);
  const confidence = jsonNumber(payload.confidence);
  const source = jsonString(payload.source);
  const notes = jsonString(payload.notes);
  if (!id || !projectId || !type || !status || !role || !start || !end || allocationPct === null || confidence === null || !source || !notes) return null;
  return {
    id,
    personId: jsonString(payload.personId),
    projectId,
    type: type as ResourceAssignment["type"],
    status: status as ResourceAssignment["status"],
    role,
    start,
    end,
    allocationPct,
    confidence,
    source,
    notes,
  };
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

function toOperationalHistory(record: {
  id: string;
  canonicalAllocationId: string;
  canonicalPersonId: string | null;
  canonicalProjectId: string;
  action: string;
  actor: string;
  summary: string;
  beforePayload: Prisma.JsonValue;
  afterPayload: Prisma.JsonValue;
  createdAt: Date;
}): ResourceAllocationHistoryEntry {
  return {
    id: record.id,
    assignmentId: record.canonicalAllocationId,
    personId: record.canonicalPersonId,
    projectId: record.canonicalProjectId,
    action: record.action,
    actor: record.actor,
    at: record.createdAt.toISOString(),
    summary: record.summary,
    before: toHistoryAssignment(record.beforePayload),
    after: toHistoryAssignment(record.afterPayload),
  };
}

function toResourceComment(record: {
  id: string;
  targetType: string;
  targetId: string;
  body: string;
  authorId: string | null;
  authorName: string;
  authorRole: string;
  createdAt: Date;
}): ResourceComment {
  return {
    id: record.id,
    targetType: record.targetType as ResourceComment["targetType"],
    targetId: record.targetId,
    body: record.body,
    authorId: record.authorId,
    authorName: record.authorName,
    authorRole: record.authorRole,
    at: record.createdAt.toISOString(),
  };
}

export default async function ResourceCommandCentrePage() {
  const session = await getSession();
  const operationalRecords = await prisma.resourcePlannedAllocation.findMany({
    orderBy: { updatedAt: "desc" },
  });
  let operationalHistory: ResourceAllocationHistoryEntry[] = [];
  try {
    const historyRecords = await prisma.resourceAllocationHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    operationalHistory = historyRecords.map(toOperationalHistory);
  } catch (error) {
    console.error("Failed to load resource allocation history", error);
  }
  let operationalComments: ResourceComment[] = [];
  try {
    const commentRecords = await prisma.resourceComment.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    operationalComments = commentRecords.map(toResourceComment);
  } catch (error) {
    console.error("Failed to load resource comments", error);
  }
  const operationalAssignments = operationalRecords
    .map(toOperationalAssignment)
    .filter((assignment): assignment is ResourceAssignment => assignment !== null);
  const operationalIds = new Set(operationalAssignments.map((assignment) => assignment.id));
  const initialAssignments = [
    ...operationalAssignments,
    ...resourceAssignments.filter((assignment) => !operationalIds.has(assignment.id)),
  ];
  return (
    <ResourceCommandCentreClient
      initialAssignments={initialAssignments}
      initialAllocationHistory={operationalHistory}
      initialComments={operationalComments}
      currentUser={session ? { id: session.userId, name: session.name, role: session.role, permission: session.permission, canEdit: session.canEdit, isAdmin: session.isAdmin } : null}
    />
  );
}
