import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.resourceOutboundEvent.deleteMany();
  await prisma.resourceFailedRecord.deleteMany();
  await prisma.resourceSyncRun.deleteMany();
  await prisma.resourcePlannedAllocation.deleteMany();
  console.log("Reset resource MLVizz demo tables. Run npm run db:seed-mlvizz to reseed.");
}

main().finally(async () => prisma.$disconnect());
