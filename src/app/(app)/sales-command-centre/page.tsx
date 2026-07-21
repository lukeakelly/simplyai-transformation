import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveHubSpotProvider } from "@/integrations/hubspot/factory";
import type { HubSpotSnapshot } from "@/integrations/hubspot/types";
import {
  buildSalesCommandCentreViewModel,
  resolvePeriod,
  type PeriodFilter,
  type TargetPeriodType,
} from "@/lib/sales-command-data";
import { SalesCommandCentreClient } from "./SalesCommandCentreClient";

export const dynamic = "force-dynamic";

const PERIOD_FILTERS: PeriodFilter[] = ["MONTH", "QUARTER", "FY", "CALENDAR_YEAR", "CUSTOM"];

function parsePeriodFilter(value: string | string[] | undefined): PeriodFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return PERIOD_FILTERS.includes(v as PeriodFilter) ? (v as PeriodFilter) : "MONTH";
}

export default async function SalesCommandCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const session = await getSession();

  const now = new Date();
  const filter = parsePeriodFilter(params.period);
  const customStart = typeof params.start === "string" ? params.start : undefined;
  const customEnd = typeof params.end === "string" ? params.end : undefined;
  const period = resolvePeriod(filter, now, filter === "CUSTOM" ? { start: customStart ?? "", end: customEnd ?? "" } : undefined);

  // No HubSpot private-app token is configured in this environment, so the
  // "live" provider always falls back to demo data — the toggle below still
  // reflects the user's explicit choice once a live integration exists.
  const demoRequested = params.demo !== "0";
  const ownerId = session?.hubspotOwnerId ?? "demo-owner";

  let snapshotError: string | null = null;
  let snapshot: HubSpotSnapshot | null = null;
  const provider = resolveHubSpotProvider(demoRequested);
  try {
    snapshot = await provider.getSnapshot({ ownerId });
  } catch (error) {
    console.error("Failed to load HubSpot snapshot", error);
    snapshotError = error instanceof Error ? error.message : "Unknown error";
  }

  let targetAmount: number | null = null;
  if (session && period.target) {
    const targetRow = await prisma.salesTarget
      .findUnique({
        where: {
          userId_periodType_periodKey: {
            userId: session.userId,
            periodType: period.target.periodType,
            periodKey: period.target.periodKey,
          },
        },
      })
      .catch(() => null);
    targetAmount = targetRow?.amount ?? null;
  }

  const allTargets = session
    ? await prisma.salesTarget.findMany({ where: { userId: session.userId } }).catch(() => [])
    : [];

  const activityActions = session
    ? await prisma.salesActivityAction
        .findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" }, take: 500 })
        .catch(() => [])
    : [];

  const viewModel = snapshot
    ? buildSalesCommandCentreViewModel(snapshot, period, targetAmount, now, activityActions)
    : null;

  const firstName = (session?.name ?? "there").split(" ")[0] || "there";

  return (
    <SalesCommandCentreClient
      currentUser={
        session
          ? { id: session.userId, name: session.name, firstName, hubspotOwnerId: session.hubspotOwnerId }
          : null
      }
      snapshot={snapshot}
      snapshotError={snapshotError}
      viewModel={viewModel}
      targets={allTargets.map((t) => ({ periodType: t.periodType as TargetPeriodType, periodKey: t.periodKey, amount: t.amount }))}
      selectedFilter={filter}
      customRange={{ start: customStart ?? "", end: customEnd ?? "" }}
      demoMode={demoRequested}
      now={now.toISOString()}
    />
  );
}
