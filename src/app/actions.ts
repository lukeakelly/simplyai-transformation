"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

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
  notes?: string | null;
};

export async function createTask(input: TaskInput) {
  const count = await prisma.task.count({
    where: { horizonId: input.horizonId ?? null },
  });
  await prisma.task.create({
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
      notes: input.notes ?? null,
      position: count,
    },
  });
  revalidateAll();
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
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
    "notes",
  ];
  const required = new Set<keyof TaskInput>(["title", "workstream", "status"]);
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
  await prisma.task.update({ where: { id }, data });
  revalidateAll();
}

export async function toggleTaskDone(id: string, done: boolean) {
  await prisma.task.update({
    where: { id },
    data: done
      ? { status: "Embedded", completion: 100 }
      : { status: "In Progress", completion: 50 },
  });
  revalidateAll();
}

export async function setTaskStatus(id: string, status: string) {
  await prisma.task.update({ where: { id }, data: { status } });
  revalidateAll();
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

export async function moveTaskToHorizon(
  taskId: string,
  horizonId: string | null,
  newPosition: number,
) {
  await prisma.task.update({
    where: { id: taskId },
    data: { horizonId, position: newPosition },
  });
  revalidateAll();
}

export async function reorderTasksInHorizon(
  horizonId: string | null,
  orderedIds: string[],
) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { horizonId, position: index },
      }),
    ),
  );
  revalidateAll();
}

// ---- Horizon actions ----

export async function createHorizon(input: {
  name: string;
  color?: string;
  startDate?: string | null;
  endDate?: string | null;
}) {
  const max = await prisma.horizon.aggregate({ _max: { order: true } });
  await prisma.horizon.create({
    data: {
      name: input.name.trim() || "New phase",
      color: input.color ?? "#2563eb",
      order: (max._max.order ?? -1) + 1,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
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
  await prisma.horizon.update({ where: { id }, data });
  revalidateAll();
}

export async function deleteHorizon(id: string) {
  await prisma.task.updateMany({
    where: { horizonId: id },
    data: { horizonId: null },
  });
  await prisma.horizon.delete({ where: { id } });
  revalidateAll();
}

export async function reorderHorizons(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.horizon.update({ where: { id }, data: { order: index } }),
    ),
  );
  revalidateAll();
}

// ---- Person actions ----

export async function createPerson(input: {
  name: string;
  title?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  try {
    await prisma.person.create({
      data: {
        name,
        title: input.title ?? null,
        email: input.email ?? null,
      },
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
  try {
    await prisma.person.update({ where: { id }, data });
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
  await prisma.task.updateMany({
    where: { ownerId: id },
    data: { ownerId: null },
  });
  await prisma.task.updateMany({
    where: { accountableId: id },
    data: { accountableId: null },
  });
  await prisma.person.delete({ where: { id } });
  revalidateAll();
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
