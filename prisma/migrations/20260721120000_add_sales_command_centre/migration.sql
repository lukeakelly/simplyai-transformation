-- AlterTable
ALTER TABLE "User" ADD COLUMN "hubspotOwnerId" TEXT;

-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesActivityAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalType" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesActivityAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_hubspotOwnerId_idx" ON "User"("hubspotOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesTarget_userId_periodType_periodKey_key" ON "SalesTarget"("userId", "periodType", "periodKey");

-- CreateIndex
CREATE INDEX "SalesTarget_userId_idx" ON "SalesTarget"("userId");

-- CreateIndex
CREATE INDEX "SalesActivityAction_userId_idx" ON "SalesActivityAction"("userId");

-- CreateIndex
CREATE INDEX "SalesActivityAction_userId_externalId_idx" ON "SalesActivityAction"("userId", "externalId");

-- AddForeignKey
ALTER TABLE "SalesTarget" ADD CONSTRAINT "SalesTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivityAction" ADD CONSTRAINT "SalesActivityAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
