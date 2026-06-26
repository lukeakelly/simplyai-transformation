import { getTasks, getHorizons, getPeople } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { TimelineClient } from "./TimelineClient";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const [tasks, horizons, people, session] = await Promise.all([
    getTasks(),
    getHorizons(),
    getPeople(),
    getSession(),
  ]);

  return (
    <TimelineClient
      tasks={tasks}
      horizons={horizons}
      people={people}
      canEdit={session?.canEdit ?? false}
    />
  );
}
