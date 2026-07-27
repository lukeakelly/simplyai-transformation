"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TargetPeriodType } from "@/lib/sales-command-data";

export async function saveSalesTarget(periodType: TargetPeriodType, periodKey: string, amount: number) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated.");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid target amount.");

  await prisma.salesTarget.upsert({
    where: { userId_periodType_periodKey: { userId: session.userId, periodType, periodKey } },
    update: { amount },
    create: { userId: session.userId, periodType, periodKey, amount },
  });
  revalidatePath("/sales-command-centre");
}

export type ActivityActionType = "COMPLETE" | "SNOOZE" | "DISMISS";
export type ActivityExternalType = "DEAL" | "TASK";

export async function recordActivityAction(
  externalId: string,
  externalType: ActivityExternalType,
  actionType: ActivityActionType,
  options?: { reason?: string; snoozedUntil?: string },
) {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated.");

  await prisma.salesActivityAction.create({
    data: {
      userId: session.userId,
      externalId,
      externalType,
      actionType,
      reason: options?.reason ?? null,
      snoozedUntil: options?.snoozedUntil ? new Date(options.snoozedUntil) : null,
    },
  });
  revalidatePath("/sales-command-centre");
}
