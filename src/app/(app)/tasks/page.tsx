import { getTasks, getHorizons, getPeople } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { PRIORITIES } from "@/lib/constants";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

const ORIGINS = ["Dora", "Transformation Plan (only)"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string; origin?: string }>;
}) {
  const [tasks, horizons, people, session, params] = await Promise.all([
    getTasks(),
    getHorizons(),
    getPeople(),
    getSession(),
    searchParams,
  ]);

  const workstreams = Array.from(
    new Set(tasks.map((t) => t.workstream).filter(Boolean)),
  ).sort();

  const initialPriority = PRIORITIES.includes(
    params.priority as (typeof PRIORITIES)[number],
  )
    ? params.priority ?? ""
    : "";
  const initialOrigin =
    params.origin && ORIGINS.includes(params.origin) ? params.origin : "";

  return (
    <TasksClient
      tasks={tasks}
      horizons={horizons}
      people={people}
      workstreams={workstreams}
      canEdit={session?.canEdit ?? false}
      currentUserName={session?.name?.trim() || session?.username || "You"}
      initialPriority={initialPriority}
      initialOrigin={initialOrigin}
    />
  );
}
