import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

// Item IDs of the additional Dora sheet rows that did not previously have a
// 1:1 task. Read from seed-data.json (single source of truth) and upserted
// into the live DB without wiping existing data/edits/comments.
const NEW_ITEM_IDS = ["DORA-001", "DORA-002", "DORA-003", "DORA-004"];

type SeedTask = {
  itemId: string;
  workstream: string;
  category: string | null;
  title: string;
  description: string | null;
  whyItMatters: string | null;
  output: string | null;
  artefactType: string | null;
  ownerRole: string | null;
  accountableExec: string | null;
  contributors: string | null;
  priority: string | null;
  horizon: string | null;
  targetDate: string | null;
  status: string;
  completion: number;
  recurrence: string | null;
  cadence: string | null;
  dependencies: string | null;
  risks: string | null;
  evidence: string | null;
  doneCriteria: string | null;
  source: string | null;
  notes: string | null;
};

async function personId(name: string | null): Promise<string | null> {
  if (!name) return null;
  const existing = await prisma.person.findUnique({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.person.create({ data: { name, title: name } });
  return created.id;
}

async function main() {
  const data: { tasks: SeedTask[] } = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data.json"), "utf-8"),
  );

  for (const itemId of NEW_ITEM_IDS) {
    const t = data.tasks.find((x) => x.itemId === itemId);
    if (!t) {
      console.log(`! ${itemId} not found in seed-data.json — skipped`);
      continue;
    }

    const existing = await prisma.task.findUnique({ where: { itemId } });
    if (existing) {
      console.log(`= ${itemId} already exists — skipped`);
      continue;
    }

    const horizon = t.horizon
      ? await prisma.horizon.findFirst({ where: { name: t.horizon } })
      : null;

    // Append to the end of the target horizon.
    const last = await prisma.task.findFirst({
      where: { horizonId: horizon?.id ?? null },
      orderBy: { position: "desc" },
    });
    const position = (last?.position ?? -1) + 1;

    await prisma.task.create({
      data: {
        itemId: t.itemId,
        workstream: t.workstream,
        category: t.category,
        title: t.title,
        description: t.description,
        whyItMatters: t.whyItMatters,
        output: t.output,
        artefactType: t.artefactType,
        ownerRole: t.ownerRole,
        ownerId: await personId(t.ownerRole),
        accountableId: await personId(t.accountableExec),
        contributors: t.contributors,
        priority: t.priority,
        horizonId: horizon?.id ?? null,
        targetDate: t.targetDate ? new Date(t.targetDate) : null,
        status: t.status,
        completion: t.completion,
        recurrence: t.recurrence,
        cadence: t.cadence,
        dependencies: t.dependencies,
        risks: t.risks,
        evidence: t.evidence,
        doneCriteria: t.doneCriteria,
        source: t.source,
        origin: (t.source ?? "").toLowerCase().includes("dora")
          ? "Dora"
          : "Transformation Plan (only)",
        notes: t.notes,
        position,
      },
    });
    console.log(`+ ${itemId} created (${t.workstream}, origin Dora)`);
  }

  const dora = await prisma.task.count({ where: { origin: "Dora" } });
  const total = await prisma.task.count();
  console.log(`\nDora tasks: ${dora} / ${total} total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
