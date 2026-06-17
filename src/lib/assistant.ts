import { prisma } from "@/lib/prisma";
import { DONE_STATUSES } from "@/lib/constants";

/**
 * Builds a compact, grounded snapshot of the whole programme for the assistant.
 * Everything the model answers from is computed here from the live database, so
 * quantitative answers (per-person completion, counts, ownership) are exact
 * rather than inferred. The dataset is small enough to fit in context.
 */
export async function buildAssistantContext(): Promise<string> {
  const [tasks, people, horizons] = await Promise.all([
    prisma.task.findMany({
      include: { owner: true, accountable: true, horizon: true },
      orderBy: [{ horizonId: "asc" }, { position: "asc" }],
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.horizon.findMany({ orderBy: { order: "asc" } }),
  ]);

  const total = tasks.length;
  const done = tasks.filter((t) => DONE_STATUSES.has(t.status)).length;
  const avgCompletion =
    total === 0
      ? 0
      : Math.round(tasks.reduce((s, t) => s + t.completion, 0) / total);

  // Group tasks by a key and pre-compute count / done / average completion so
  // the model never has to derive these numbers itself (it gets them wrong).
  const groupStats = (key: (t: (typeof tasks)[number]) => string) => {
    const acc: Record<string, { count: number; done: number; sum: number }> =
      {};
    for (const t of tasks) {
      const k = key(t);
      const g = (acc[k] ??= { count: 0, done: 0, sum: 0 });
      g.count += 1;
      g.sum += t.completion;
      if (DONE_STATUSES.has(t.status)) g.done += 1;
    }
    const out: Record<
      string,
      { count: number; done: number; avgCompletion: number }
    > = {};
    for (const [k, g] of Object.entries(acc)) {
      out[k] = {
        count: g.count,
        done: g.done,
        avgCompletion: Math.round(g.sum / g.count),
      };
    }
    return out;
  };

  const byStatus = groupStats((t) => t.status);
  const byPriority = groupStats((t) => t.priority ?? "Unspecified");
  const byWorkstream = groupStats((t) => t.workstream);
  const byHorizon = groupStats((t) => t.horizon?.name ?? "Unscheduled");
  const bySource = groupStats((t) => t.origin);

  // Per-owner aggregates (by owner name).
  type OwnerStat = {
    name: string;
    owned: number;
    done: number;
    avgCompletion: number;
    accountable: number;
  };
  const ownerMap = new Map<string, OwnerStat>();
  const ensure = (name: string): OwnerStat => {
    let s = ownerMap.get(name);
    if (!s) {
      s = { name, owned: 0, done: 0, avgCompletion: 0, accountable: 0 };
      ownerMap.set(name, s);
    }
    return s;
  };
  const ownerCompletionTotals = new Map<string, number>();
  for (const t of tasks) {
    const ownerName = t.owner?.name ?? t.ownerRole ?? null;
    if (ownerName) {
      const s = ensure(ownerName);
      s.owned += 1;
      if (DONE_STATUSES.has(t.status)) s.done += 1;
      ownerCompletionTotals.set(
        ownerName,
        (ownerCompletionTotals.get(ownerName) ?? 0) + t.completion,
      );
    }
    const accName = t.accountable?.name ?? null;
    if (accName) ensure(accName).accountable += 1;
  }
  for (const [name, s] of ownerMap) {
    s.avgCompletion =
      s.owned === 0
        ? 0
        : Math.round((ownerCompletionTotals.get(name) ?? 0) / s.owned);
  }
  const ownerStats = [...ownerMap.values()].sort((a, b) => b.owned - a.owned);

  // Compact per-task rows. Keep fields short to control token usage.
  const taskRows = tasks.map((t) => ({
    id: t.itemId ?? t.id,
    title: t.title,
    workstream: t.workstream,
    category: t.category ?? null,
    owner: t.owner?.name ?? t.ownerRole ?? null,
    accountable: t.accountable?.name ?? null,
    contributors: t.contributors ?? null,
    priority: t.priority ?? null,
    status: t.status,
    completion: t.completion,
    horizon: t.horizon?.name ?? null,
    source: t.origin,
  }));

  const snapshot = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTasks: total,
      completed: done,
      inProgress: tasks.filter(
        (t) => !DONE_STATUSES.has(t.status) && t.status !== "Not Started",
      ).length,
      notStarted: tasks.filter((t) => t.status === "Not Started").length,
      averageCompletionPercent: avgCompletion,
      doneStatuses: [...DONE_STATUSES],
      peopleCount: people.length,
    },
    statGroupsNote:
      "Each group below maps a key to { count, done, avgCompletion } — use these directly; do not recompute.",
    byStatus,
    byPriority,
    byWorkstream,
    byHorizon,
    bySource,
    horizonsInOrder: horizons.map((h) => h.name),
    ownerStats,
    tasks: taskRows,
  };

  return JSON.stringify(snapshot);
}

export const ASSISTANT_SYSTEM_PROMPT = `You are the Simplyai Transformation assistant, embedded in a programme-tracking dashboard.

You answer questions about the transformation programme using ONLY the JSON snapshot provided in the next message. The snapshot is generated live from the application's database and is the single source of truth.

Rules:
- Base every answer strictly on the snapshot. Never invent tasks, people, numbers, owners, or statuses.
- If the snapshot does not contain the answer, say so plainly and suggest what the user could ask instead.
- For quantitative questions, ALWAYS use the pre-computed aggregates — never recompute counts or averages yourself from the task list, as that is error-prone. The authoritative aggregates are: summary; the grouped stats byStatus, byPriority, byWorkstream, byHorizon, bySource (each maps a key to { count, done, avgCompletion }); and ownerStats. A done task is one in a done status (${[
  ...DONE_STATUSES,
].join(", ")}).
- "% complete" of a group or person means that group/person's avgCompletion from the aggregates (e.g. bySource["Dora"].avgCompletion for Dora completion; ownerStats[].avgCompletion for a person) unless the user clearly means the share of tasks that are done.
- "source"/"Dora" refers to the task.source field ("Dora" vs "Transformation Plan (only)"); use bySource for its count/avgCompletion.
- Be concise and concrete. Use short paragraphs or bullet points. When listing tasks, include the id and title, and relevant fields (owner, status, completion, horizon).
- When a person is referenced by a name that maps to a role (e.g. Jason=CEO, Luke=COO, Wayne=CFO, Gina=CInO, Kylie=CTRO), match against the owner names in the snapshot, which may be role labels or person names.
- Format numbers as given (completion values are percentages 0-100).
- Never reveal credentials, password hashes, or anything not in the snapshot.`;
