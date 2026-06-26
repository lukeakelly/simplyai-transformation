import { prisma } from "@/lib/prisma";
import { DONE_STATUSES } from "@/lib/constants";

export async function getHorizons() {
  return prisma.horizon.findMany({ orderBy: { order: "asc" } });
}

export async function getPeople() {
  return prisma.person.findMany({ orderBy: { name: "asc" } });
}

export async function getTasks() {
  return prisma.task.findMany({
    orderBy: [{ horizonId: "asc" }, { position: "asc" }],
    include: {
      owner: true,
      accountable: true,
      horizon: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type TaskWithRelations = Awaited<ReturnType<typeof getTasks>>[number];
export type HorizonRecord = Awaited<ReturnType<typeof getHorizons>>[number];
export type PersonRecord = Awaited<ReturnType<typeof getPeople>>[number];

export async function getDashboardStats() {
  const tasks = await prisma.task.findMany({
    include: { horizon: true },
  });

  const total = tasks.length;
  const completion =
    total === 0
      ? 0
      : Math.round(tasks.reduce((s, t) => s + t.completion, 0) / total);
  const done = tasks.filter((t) => DONE_STATUSES.has(t.status)).length;
  const inProgress = tasks.filter(
    (t) => !DONE_STATUSES.has(t.status) && t.status !== "Not Started",
  ).length;
  const notStarted = tasks.filter((t) => t.status === "Not Started").length;
  const atRisk = tasks.filter(
    (t) => t.status === "At Risk" || t.status === "Blocked",
  ).length;

  const byStatus = countBy(tasks, (t) => t.status);
  const byPriority = countBy(tasks, (t) => t.priority ?? "Unspecified");
  const byWorkstream = countBy(tasks, (t) => t.workstream);
  const byHorizon = countBy(tasks, (t) => t.horizon?.name ?? "Unscheduled");

  const criticalPath = tasks.filter((t) => t.priority === "Critical Path");
  const criticalDone = criticalPath.filter((t) =>
    DONE_STATUSES.has(t.status),
  ).length;
  const criticalCompletion =
    criticalPath.length === 0
      ? 0
      : Math.round(
          criticalPath.reduce((s, t) => s + t.completion, 0) /
            criticalPath.length,
        );

  const dora = tasks.filter((t) => t.origin === "Dora");
  const doraDone = dora.filter((t) => DONE_STATUSES.has(t.status)).length;
  const doraCompletion =
    dora.length === 0
      ? 0
      : Math.round(dora.reduce((s, t) => s + t.completion, 0) / dora.length);

  return {
    total,
    completion,
    done,
    inProgress,
    notStarted,
    atRisk,
    criticalTotal: criticalPath.length,
    criticalDone,
    criticalCompletion,
    doraTotal: dora.length,
    doraDone,
    doraCompletion,
    byStatus,
    byPriority,
    byWorkstream,
    byHorizon,
  };
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
