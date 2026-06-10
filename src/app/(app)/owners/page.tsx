import { prisma } from "@/lib/prisma";
import { DONE_STATUSES } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { OwnersClient } from "./OwnersClient";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const [people, tasks, session] = await Promise.all([
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      select: {
        ownerId: true,
        accountableId: true,
        status: true,
        completion: true,
      },
    }),
    getSession(),
  ]);

  const summary = people.map((p) => {
    const owned = tasks.filter((t) => t.ownerId === p.id);
    const accountable = tasks.filter((t) => t.accountableId === p.id);
    const done = owned.filter((t) => DONE_STATUSES.has(t.status)).length;
    const avg =
      owned.length === 0
        ? 0
        : Math.round(
            owned.reduce((s, t) => s + t.completion, 0) / owned.length,
          );
    return {
      id: p.id,
      name: p.name,
      title: p.title,
      email: p.email,
      owned: owned.length,
      accountable: accountable.length,
      done,
      avg,
    };
  });

  const unassigned = tasks.filter((t) => !t.ownerId).length;

  return (
    <OwnersClient
      summary={summary}
      unassigned={unassigned}
      canEdit={session?.canEdit ?? false}
    />
  );
}
