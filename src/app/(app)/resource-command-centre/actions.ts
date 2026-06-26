"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, requireEditor } from "@/lib/auth";
import type { ResourceCommentTargetType } from "@/lib/resource-command-data";

export type ResourcePlanningEventInput = {
  eventType: "planned-allocation" | "team-member" | "approval" | "resource-request";
  sourceRecordId: string;
  correlationId: string;
  canonicalAllocationId?: string;
  canonicalPersonId?: string | null;
  canonicalProjectId?: string;
  canonicalRequestId?: string | null;
  status?: string;
  allocationType?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  allocationPct?: number;
  confidencePct?: number;
  payload: Prisma.InputJsonObject;
};

export type ResourceCommentInput = {
  targetType: ResourceCommentTargetType;
  targetId: string;
  body: string;
};

function inputJsonObject(value: Prisma.InputJsonValue | null | undefined): Prisma.InputJsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value) || "toJSON" in value) return {};
  return value as Prisma.InputJsonObject;
}

function inputJsonString(value: Prisma.InputJsonValue | null | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export async function saveResourcePlanningEvent(input: ResourcePlanningEventInput) {
  try {
    await requireEditor();
    if (input.eventType === "planned-allocation" && input.canonicalAllocationId && input.canonicalProjectId && input.startDate && input.endDate) {
      await prisma.resourcePlannedAllocation.upsert({
        where: { canonicalAllocationId: input.canonicalAllocationId },
        create: {
          canonicalAllocationId: input.canonicalAllocationId,
          canonicalPersonId: input.canonicalPersonId,
          canonicalProjectId: input.canonicalProjectId,
          canonicalRequestId: input.canonicalRequestId,
          status: input.status ?? "planned",
          allocationType: input.allocationType ?? "billable",
          role: input.role ?? "Unspecified",
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: new Date(`${input.endDate}T00:00:00.000Z`),
          allocationPct: input.allocationPct ?? 0,
          confidencePct: input.confidencePct ?? 0,
          payload: input.payload,
        },
        update: {
          canonicalPersonId: input.canonicalPersonId,
          canonicalProjectId: input.canonicalProjectId,
          canonicalRequestId: input.canonicalRequestId,
          status: input.status ?? "planned",
          allocationType: input.allocationType ?? "billable",
          role: input.role ?? "Unspecified",
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: new Date(`${input.endDate}T00:00:00.000Z`),
          allocationPct: input.allocationPct ?? 0,
          confidencePct: input.confidencePct ?? 0,
          payload: input.payload,
        },
      });
      await prisma.resourceAllocationHistory.create({
        data: {
          canonicalAllocationId: input.canonicalAllocationId,
          canonicalPersonId: input.canonicalPersonId,
          canonicalProjectId: input.canonicalProjectId,
          action: inputJsonString(input.payload.eventLabel, "Updated allocation"),
          actor: inputJsonString(input.payload.actor, "COO / Resource Manager"),
          summary: inputJsonString(input.payload.historySummary, "Allocation changed in the resource planning workspace."),
          beforePayload: inputJsonObject(input.payload.beforeAssignment),
          afterPayload: inputJsonObject(input.payload.afterAssignment),
        },
      });
    }

    await prisma.resourceOutboundEvent.create({
      data: {
        eventType: input.eventType,
        sourceRecordId: input.sourceRecordId,
        correlationId: input.correlationId,
        payload: input.payload,
      },
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to persist resource planning event", error);
    return { ok: false };
  }
}

export async function saveResourceComment(input: ResourceCommentInput) {
  try {
    const session = await requireEditor();
    const body = input.body.trim();
    if (!body) return { ok: false, error: "Comment cannot be empty." };

    const comment = await prisma.resourceComment.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        body,
        authorId: session.userId,
        authorName: session.name,
        authorRole: session.role,
      },
    });

    await prisma.resourceOutboundEvent.create({
      data: {
        eventType: "approval",
        sourceRecordId: comment.id,
        correlationId: `resource-comment-${comment.id}`,
        payload: {
          sourceOfTruth: "resource-app",
          eventLabel: "Added resource comment",
          targetType: input.targetType,
          targetId: input.targetId,
          body,
          actor: session.role,
          authorId: session.userId,
        },
      },
    });

    return {
      ok: true,
      comment: {
        id: comment.id,
        targetType: input.targetType,
        targetId: input.targetId,
        body,
        authorId: session.userId,
        authorName: session.name,
        authorRole: session.role,
        at: comment.createdAt.toISOString(),
      },
    };
  } catch (error) {
    const session = await getSession();
    console.error("Failed to persist resource comment", { error, userId: session?.userId });
    return { ok: false, error: "Comment could not be saved." };
  }
}
