import { getTasks, getHorizons, getPeople } from "@/lib/data";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, horizons, people] = await Promise.all([
    getTasks(),
    getHorizons(),
    getPeople(),
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
    />
  );
}
