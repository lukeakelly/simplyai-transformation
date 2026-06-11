import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DORA = "Dora";
const PLAN = "Transformation Plan (only)";

async function main() {
  const tasks = await prisma.task.findMany({
    select: { id: true, source: true },
  });
  let dora = 0;
  let plan = 0;
  for (const t of tasks) {
    const isDora = (t.source ?? "").toLowerCase().includes("dora");
    await prisma.task.update({
      where: { id: t.id },
      data: { origin: isDora ? DORA : PLAN },
    });
    if (isDora) dora++;
    else plan++;
  }
  console.log(`Set origin: ${dora} Dora, ${plan} Transformation Plan (only).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
