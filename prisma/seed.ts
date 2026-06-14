import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

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

type SeedData = {
  tasks: SeedTask[];
  horizons: string[];
  people: string[];
};

const HORIZON_COLORS: Record<string, string> = {
  "Immediate / next 2 weeks": "#dc2626",
  "First 30 days": "#ea580c",
  "Days 31\u201360": "#d97706",
  "Days 61\u201390": "#ca8a04",
  "Months 4\u20136": "#16a34a",
  "Months 7\u201312": "#0891b2",
  "Beyond 12 months": "#7c3aed",
};

// Day offsets [startOffset, endOffset] from the transformation anchor date.
const HORIZON_RANGES: Record<string, [number, number]> = {
  "Immediate / next 2 weeks": [0, 14],
  "First 30 days": [0, 30],
  "Days 31\u201360": [31, 60],
  "Days 61\u201390": [61, 90],
  "Months 4\u20136": [91, 182],
  "Months 7\u201312": [183, 365],
  "Beyond 12 months": [366, 547],
};

const ANCHOR = new Date("2026-05-28T00:00:00.000Z");

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const data: SeedData = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data.json"), "utf-8"),
  );

  console.log("Clearing existing data...");
  await prisma.task.deleteMany();
  await prisma.horizon.deleteMany();
  await prisma.person.deleteMany();

  console.log(`Seeding ${data.horizons.length} horizons...`);
  const horizonByName = new Map<string, string>();
  for (let i = 0; i < data.horizons.length; i++) {
    const name = data.horizons[i];
    const range = HORIZON_RANGES[name];
    const created = await prisma.horizon.create({
      data: {
        name,
        order: i,
        color: HORIZON_COLORS[name] ?? "#2563eb",
        startDate: range ? addDays(ANCHOR, range[0]) : null,
        endDate: range ? addDays(ANCHOR, range[1]) : null,
      },
    });
    horizonByName.set(name, created.id);
  }

  console.log(`Seeding ${data.people.length} people...`);
  const personByName = new Map<string, string>();
  for (const name of data.people) {
    const created = await prisma.person.create({
      data: { name, title: name },
    });
    personByName.set(name, created.id);
  }

  console.log(`Seeding ${data.tasks.length} tasks...`);
  const positionByHorizon = new Map<string, number>();
  for (const t of data.tasks) {
    const horizonId = t.horizon ? horizonByName.get(t.horizon) ?? null : null;
    const key = horizonId ?? "none";
    const position = positionByHorizon.get(key) ?? 0;
    positionByHorizon.set(key, position + 1);

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
        ownerId: t.ownerRole ? personByName.get(t.ownerRole) ?? null : null,
        accountableId: t.accountableExec
          ? personByName.get(t.accountableExec) ?? null
          : null,
        contributors: t.contributors,
        priority: t.priority,
        horizonId,
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
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
