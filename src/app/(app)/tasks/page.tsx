import { getTasks, getHorizons, getPeople } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, horizons, people, session] = await Promise.all([
    getTasks(),
    getHorizons(),
    getPeople(),
    getSession(),
  ]);

  const workstreams = Array.from(
    new Set(tasks.map((t) => t.workstream).filter(Boolean)),
  ).sort();

  return (
    <TasksClient
      tasks={tasks}
      horizons={horizons}
      people={people}
      workstreams={workstreams}
      canEdit={session?.canEdit ?? false}
      currentUserName={session?.name?.trim() || session?.username || "You"}
    />
  );
}
