import { getTasks, getHorizons, getPeople } from "@/lib/data";
import { TimelineClient } from "./TimelineClient";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const [tasks, horizons, people] = await Promise.all([
    getTasks(),
    getHorizons(),
    getPeople(),
  ]);

  return (
    <TimelineClient tasks={tasks} horizons={horizons} people={people} />
  );
}
