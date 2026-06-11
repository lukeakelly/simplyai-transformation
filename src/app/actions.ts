"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireEditor, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/timeline");
  revalidatePath("/owners");
}

export type TaskInput = {
  title: string;
  workstream: string;
  category?: string | null;
  description?: string | null;
  whyItMatters?: string | null;
  output?: string | null;
  artefactType?: string | null;
  ownerId?: string | null;
  accountableId?: string | null;
  contributors?: string | null;
  priority?: string | null;
  horizonId?: string | null;
  targetDate?: string | null;
  status?: string;
  completion?: number;
  recurrence?: string | null;
  cadence?: string | null;
  dependencies?: string | null;
  risks?: string | null;
  evidence?: string | null;
  doneCriteria?: string | null;
  source?: string | null;
  origin?: string | null;
  notes?: string | null;
};

export async function createTask(input: TaskInput) {
  const session = await requireEditor();
  const count = await prisma.task.count({
    where: { horizonId: input.horizonId ?? null },
  });
  const created = await prisma.task.create({
    data: {
      title: input.title.trim() || "Untitled task",
      workstream: input.workstream || "Unassigned",
      category: input.category ?? null,
      description: input.description ?? null,
      whyItMatters: input.whyItMatters ?? null,
      output: input.output ?? null,
      artefactType: input.artefactType ?? null,
      ownerId: input.ownerId || null,
      accountableId: input.accountableId || null,
      contributors: input.contributors ?? null,
      priority: input.priority ?? null,
      horizonId: input.horizonId || null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      status: input.status ?? "Not Started",
      completion: clampPct(input.completion ?? 0),
      recurrence: input.recurrence ?? null,
      cadence: input.cadence ?? null,
      dependencies: input.dependencies ?? null,
      risks: input.risks ?? null,
      evidence: input.evidence ?? null,
      doneCriteria: input.doneCriteria ?? null,
      source: input.source ?? null,
      origin: input.origin || "Transformation Plan (only)",
      notes: input.notes ?? null,
      position: count,
    },
  });
  await logAudit({
    actorRole: session.role,
    action: "created",
    entityType: "task",
    entityId: created.id,
    entityName: created.title,
    summary: `Created task "${created.title}"`,
  });
  revalidateAll();
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
  const session = await requireEditor();
  const data: Record<string, unknown> = {};
  const keys: (keyof TaskInput)[] = [
    "title",
    "workstream",
    "category",
    "description",
    "whyItMatters",
    "output",
    "artefactType",
    "ownerId",
    "accountableId",
    "contributors",
    "priority",
    "horizonId",
    "status",
    "recurrence",
    "cadence",
    "dependencies",
    "risks",
    "evidence",
    "doneCriteria",
    "source",
    "origin",
    "notes",
  ];
  const required = new Set<keyof TaskInput>([
    "title",
    "workstream",
    "status",
    "origin",
  ]);
  for (const k of keys) {
    if (k in input) {
      const v = input[k];
      if (required.has(k)) {
        // Non-nullable columns: only update when a non-empty value is provided.
        if (v !== undefined && v !== null && v !== "") data[k] = v;
      } else {
        data[k] = v === "" ? null : v;
      }
    }
  }
  if ("completion" in input && input.completion !== undefined) {
    data.completion = clampPct(input.completion);
  }
  if ("targetDate" in input) {
    data.targetDate = input.targetDate ? new Date(input.targetDate) : null;
  }
  const updated = await prisma.task.update({ where: { id }, data });
  await logAudit({
    actorRole: session.role,
    action: "updated",
    entityType: "task",
    entityId: updated.id,
    entityName: updated.title,
    summary: `Updated task "${updated.title}" (${Object.keys(data).join(", ") || "no fields"})`,
  });
  revalidateAll();
}

export async function toggleTaskDone(id: string, done: boolean) {
  const session = await requireEditor();
  const updated = await prisma.task.update({
    where: { id },
    data: done
      ? { status: "Embedded", completion: 100 }
      : { status: "In Progress", completion: 50 },
  });
  await logAudit({
    actorRole: session.role,
    action: done ? "checked" : "unchecked",
    entityType: "task",
    entityId: updated.id,
    entityName: updated.title,
    summary: `${done ? "Completed" : "Reopened"} task "${updated.title}"`,
  });
  revalidateAll();
}

export async function setTaskStatus(id: string, status: string) {
  const session = await requireEditor();
  const updated = await prisma.task.update({
    where: { id },
    data: { status },
  });
  await logAudit({
    actorRole: session.role,
    action: "status",
    entityType: "task",
    entityId: updated.id,
    entityName: updated.title,
    summary: `Set "${updated.title}" status to ${status}`,
  });
  revalidateAll();
}

export async function deleteTask(id: string) {
  const session = await requireEditor();
  const deleted = await prisma.task.delete({ where: { id } });
  await logAudit({
    actorRole: session.role,
    action: "deleted",
    entityType: "task",
    entityId: deleted.id,
    entityName: deleted.title,
    summary: `Deleted task "${deleted.title}"`,
  });
  revalidateAll();
}

/**
 * Add a comment to a task. Available to every authenticated user, including
 * read-only reviewers — this is the one mutation a Viewer is allowed to make.
 */
export async function addComment(
  taskId: string,
  authorName: string,
  body: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated." };

  const name = authorName.trim();
  const text = body.trim();
  if (!name) return { ok: false, error: "Please add your name." };
  if (!text) return { ok: false, error: "Please enter a comment." };

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true },
  });
  if (!task) return { ok: false, error: "Task not found." };

  await prisma.comment.create({
    data: { taskId, authorName: name, body: text },
  });
  await logAudit({
    actorRole: session.role,
    action: "commented",
    entityType: "task",
    entityId: task.id,
    entityName: task.title,
    summary: `${name} commented on "${task.title}"`,
  });
  revalidateAll();
  return { ok: true };
}

export async function moveTaskToHorizon(
  taskId: string,
  horizonId: string | null,
  newPosition: number,
) {
  const session = await requireEditor();
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { horizonId, position: newPosition },
  });
  await logAudit({
    actorRole: session.role,
    action: "moved",
    entityType: "task",
    entityId: updated.id,
    entityName: updated.title,
    summary: `Moved task "${updated.title}" on the timeline`,
  });
  revalidateAll();
}

export async function reorderTasksInHorizon(
  horizonId: string | null,
  orderedIds: string[],
) {
  const session = await requireEditor();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { horizonId, position: index },
      }),
    ),
  );
  await logAudit({
    actorRole: session.role,
    action: "reordered",
    entityType: "timeline",
    summary: `Reordered ${orderedIds.length} task(s) on the timeline`,
  });
  revalidateAll();
}

// ---- Horizon actions ----

export async function createHorizon(input: {
  name: string;
  color?: string;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const session = await requireEditor();
  const max = await prisma.horizon.aggregate({ _max: { order: true } });
  const created = await prisma.horizon.create({
    data: {
      name: input.name.trim() || "New phase",
      color: input.color ?? "#2563eb",
      order: (max._max.order ?? -1) + 1,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });
  await logAudit({
    actorRole: session.role,
    action: "created",
    entityType: "horizon",
    entityId: created.id,
    entityName: created.name,
    summary: `Added timeline phase "${created.name}"`,
  });
  revalidateAll();
}

export async function updateHorizon(
  id: string,
  input: {
    name?: string;
    color?: string;
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.color !== undefined) data.color = input.color;
  if ("startDate" in input)
    data.startDate = input.startDate ? new Date(input.startDate) : null;
  if ("endDate" in input)
    data.endDate = input.endDate ? new Date(input.endDate) : null;
  const session = await requireEditor();
  const updated = await prisma.horizon.update({ where: { id }, data });
  await logAudit({
    actorRole: session.role,
    action: "updated",
    entityType: "horizon",
    entityId: updated.id,
    entityName: updated.name,
    summary: `Updated timeline phase "${updated.name}"`,
  });
  revalidateAll();
}

export async function deleteHorizon(id: string) {
  const session = await requireEditor();
  await prisma.task.updateMany({
    where: { horizonId: id },
    data: { horizonId: null },
  });
  const deleted = await prisma.horizon.delete({ where: { id } });
  await logAudit({
    actorRole: session.role,
    action: "deleted",
    entityType: "horizon",
    entityId: deleted.id,
    entityName: deleted.name,
    summary: `Deleted timeline phase "${deleted.name}"`,
  });
  revalidateAll();
}

export async function reorderHorizons(orderedIds: string[]) {
  const session = await requireEditor();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.horizon.update({ where: { id }, data: { order: index } }),
    ),
  );
  await logAudit({
    actorRole: session.role,
    action: "reordered",
    entityType: "timeline",
    summary: `Reordered timeline phases`,
  });
  revalidateAll();
}

// ---- Person actions ----

export async function createPerson(input: {
  name: string;
  title?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  const session = await requireEditor();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  try {
    const created = await prisma.person.create({
      data: {
        name,
        title: input.title ?? null,
        email: input.email ?? null,
      },
    });
    await logAudit({
      actorRole: session.role,
      action: "created",
      entityType: "owner",
      entityId: created.id,
      entityName: created.name,
      summary: `Added owner "${created.name}"`,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: `An owner named "${name}" already exists.` };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true };
}

export async function updatePerson(
  id: string,
  input: { name?: string; title?: string | null; email?: string | null },
): Promise<ActionResult> {
  const data: { name?: string; title?: string | null; email?: string | null } =
    {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Name is required." };
    data.name = name;
  }
  if ("title" in input) data.title = input.title ?? null;
  if ("email" in input) data.email = input.email ?? null;
  const session = await requireEditor();
  try {
    const updated = await prisma.person.update({ where: { id }, data });
    await logAudit({
      actorRole: session.role,
      action: "updated",
      entityType: "owner",
      entityId: updated.id,
      entityName: updated.name,
      summary: `Updated owner "${updated.name}"`,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return {
        ok: false,
        error: `An owner named "${data.name}" already exists.`,
      };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true };
}

export async function deletePerson(id: string) {
  const session = await requireEditor();
  await prisma.task.updateMany({
    where: { ownerId: id },
    data: { ownerId: null },
  });
  await prisma.task.updateMany({
    where: { accountableId: id },
    data: { accountableId: null },
  });
  const deleted = await prisma.person.delete({ where: { id } });
  await logAudit({
    actorRole: session.role,
    action: "deleted",
    entityType: "owner",
    entityId: deleted.id,
    entityName: deleted.name,
    summary: `Removed owner "${deleted.name}"`,
  });
  revalidateAll();
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
