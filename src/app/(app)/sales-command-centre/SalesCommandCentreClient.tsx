"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  ExternalLink,
  Flame,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import type { HubSpotDeal, HubSpotSnapshot } from "@/integrations/hubspot/types";
import {
  assessDealHealth,
  daysInCurrentStage,
  formatDate,
  formatDateTime,
  money,
  sortDealsForView,
  weightedAmount,
  type DealView,
  type PeriodFilter,
  type SalesCommandCentreViewModel,
  type TargetPeriodType,
} from "@/lib/sales-command-data";
import { recordActivityAction, saveSalesTarget } from "./actions";

type CurrentUser = { id: string; name: string; firstName: string; hubspotOwnerId: string | null } | null;

type Props = {
  currentUser: CurrentUser;
  snapshot: HubSpotSnapshot | null;
  snapshotError: string | null;
  viewModel: SalesCommandCentreViewModel | null;
  targets: { periodType: TargetPeriodType; periodKey: string; amount: number }[];
  selectedFilter: PeriodFilter;
  customRange: { start: string; end: string };
  demoMode: boolean;
  now: string;
};

const HEALTH_COLOR: Record<"green" | "amber" | "red", string> = {
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

const HEALTH_LABEL: Record<"green" | "amber" | "red", string> = {
  green: "On track",
  amber: "Needs attention",
  red: "Immediate action",
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "MONTH", label: "This month" },
  { value: "QUARTER", label: "This quarter" },
  { value: "FY", label: "This financial year" },
  { value: "CALENDAR_YEAR", label: "Calendar year" },
  { value: "CUSTOM", label: "Custom range" },
];

const VIEW_OPTIONS: { value: DealView; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "value", label: "Value" },
  { value: "closing_soon", label: "Closing soon" },
  { value: "at_risk", label: "At risk" },
  { value: "recently_inactive", label: "Recently inactive" },
];

function HealthPill({ level, reasons }: { level: "green" | "amber" | "red"; reasons: string[] }) {
  const color = HEALTH_COLOR[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: `${color}22`, color }}
      title={reasons.join(" · ") || HEALTH_LABEL[level]}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {HEALTH_LABEL[level]}
    </span>
  );
}

function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  defaultCollapsed = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex flex-wrap items-start justify-between gap-3 ${collapsed ? "" : "mb-4"}`}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="flex items-start gap-2 text-left group -m-1 p-1 rounded-lg hover:bg-slate-50"
        >
          <span className="mt-0.5 text-slate-400 group-hover:text-slate-600">
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </span>
          <span>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              {icon}
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </span>
        </button>
        {action}
      </div>
      {!collapsed && children}
    </section>
  );
}

function Bar({ pct, color = "#2563eb" }: { pct: number; color?: string }) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-slate-400 py-6 text-center">{label}</p>;
}

export function SalesCommandCentreClient({
  currentUser,
  snapshot,
  snapshotError,
  viewModel,
  targets,
  selectedFilter,
  customRange,
  demoMode,
  now,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [dealView, setDealView] = useState<DealView>("priority");
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [hiddenPriorityIds, setHiddenPriorityIds] = useState<Set<string>>(new Set());
  const [dismissReasonId, setDismissReasonId] = useState<string | null>(null);
  const [askInput, setAskInput] = useState("");

  const period = viewModel?.period;
  const currentTargetKey = period?.target;
  const currentTarget = currentTargetKey
    ? targets.find((t) => t.periodType === currentTargetKey.periodType && t.periodKey === currentTargetKey.periodKey)
    : undefined;
  const [targetInput, setTargetInput] = useState(currentTarget ? String(currentTarget.amount) : "");
  const [targetSavedAt, setTargetSavedAt] = useState<string | null>(null);

  function updateQuery(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    for (const [key, value] of Object.entries(patch)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${sp.toString()}`);
    });
  }

  const nowDate = useMemo(() => new Date(now), [now]);

  const deals = useMemo(() => snapshot?.deals ?? [], [snapshot]);
  const sortedDeals = useMemo(() => sortDealsForView(deals, dealView, nowDate), [deals, dealView, nowDate]);
  const visiblePriorities = useMemo(
    () => (viewModel?.priorities ?? []).filter((p) => !hiddenPriorityIds.has(p.id)),
    [viewModel, hiddenPriorityIds],
  );

  async function handleTargetSave() {
    if (!currentTargetKey) return;
    const amount = Number(targetInput);
    if (!Number.isFinite(amount) || amount < 0) return;
    await saveSalesTarget(currentTargetKey.periodType, currentTargetKey.periodKey, amount);
    setTargetSavedAt(new Date().toISOString());
    router.refresh();
  }

  async function handlePriorityAction(id: string, externalId: string, externalType: "DEAL" | "TASK", action: "COMPLETE" | "SNOOZE" | "DISMISS", reason?: string) {
    setHiddenPriorityIds((prev) => new Set(prev).add(id));
    setDismissReasonId(null);
    const snoozedUntil = action === "SNOOZE" ? new Date(nowDate.getTime() + 3 * 86_400_000).toISOString() : undefined;
    await recordActivityAction(externalId, externalType, action, { reason, snoozedUntil });
    router.refresh();
  }

  if (!currentUser) {
    return <EmptyState label="Sign in to see your Sales Command Centre." />;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-slate-900 text-white p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Good morning, {currentUser.firstName}</h1>
            <p className="text-slate-300 text-sm mt-1">
              {new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(nowDate)}
              {" · "}
              {period?.label ?? ""}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                Last HubSpot refresh: {snapshot ? formatDateTime(snapshot.fetchedAt) : "unavailable"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${
                  snapshot?.dataSource === "demo" ? "bg-purple-500/20 text-purple-200" : "bg-emerald-500/20 text-emerald-200"
                }`}
              >
                {snapshot?.dataSource === "demo" ? "Demonstration data" : "Live HubSpot data"}
              </span>
              {!currentUser.hubspotOwnerId && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200 font-medium">
                  <AlertTriangle size={12} /> No HubSpot owner linked to your account yet
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => updateQuery({ demo: e.target.checked ? undefined : "0" })}
                  className="accent-blue-500"
                />
                Demo data
              </label>
              <button
                onClick={() => router.refresh()}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-medium border border-white/10 disabled:opacity-50"
              >
                <RefreshCw size={13} className={isPending ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateQuery({ period: opt.value })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    selectedFilter === opt.value
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-white/15 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {selectedFilter === "CUSTOM" && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  defaultValue={customRange.start}
                  onBlur={(e) => updateQuery({ start: e.target.value })}
                  className="rounded-md bg-white/10 border border-white/15 px-2 py-1 text-white"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  defaultValue={customRange.end}
                  onBlur={(e) => updateQuery({ end: e.target.value })}
                  className="rounded-md bg-white/10 border border-white/15 px-2 py-1 text-white"
                />
              </div>
            )}
          </div>
        </div>

        {snapshotError && (
          <div className="mt-4 rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-2 text-sm text-red-200 flex items-center gap-2">
            <AlertTriangle size={14} /> Couldn&rsquo;t refresh from HubSpot ({snapshotError}). Showing the most recent data available.
          </div>
        )}

        {!demoMode && snapshot?.dataSource === "demo" && (
          <div className="mt-4 rounded-lg bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-sm text-amber-200 flex items-center gap-2">
            <AlertTriangle size={14} /> No live HubSpot integration is configured in this environment yet, so demo data is still showing even with the switch off.
          </div>
        )}

        {viewModel && (
          <div className="mt-5 rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5 mb-2">
              <Sparkles size={13} /> What matters today
            </h3>
            <ul className="space-y-1.5 text-sm text-slate-100">
              {viewModel.whatMattersToday.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-400">{i + 1}.</span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 mt-2">Auto-generated from your pipeline data below — not a live model call yet.</p>
          </div>
        )}
      </div>

      {!viewModel ? (
        <Card title="Data unavailable" icon={<AlertTriangle size={16} />}>
          <EmptyState label="We couldn't load your HubSpot data. Try refreshing, or switch on demo data above." />
        </Card>
      ) : (
        <>
          {/* Section 1: Target & performance */}
          <Card
            title="My target and performance"
            subtitle={`${period?.label} · Forecast basis: ${viewModel.performance.forecastBasis}`}
            icon={<Target size={16} className="text-blue-600" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-end gap-3">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{money(viewModel.performance.closedWonRevenue)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Closed-won revenue this period</div>
                  </div>
                  <span
                    className="ml-2 mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background:
                        viewModel.performance.status === "Ahead"
                          ? "#10b98122"
                          : viewModel.performance.status === "On Track"
                            ? "#2563eb22"
                            : viewModel.performance.status === "At Risk"
                              ? "#f59e0b22"
                              : viewModel.performance.status === "Off Track"
                                ? "#ef444422"
                                : "#94a3b822",
                      color:
                        viewModel.performance.status === "Ahead"
                          ? "#10b981"
                          : viewModel.performance.status === "On Track"
                            ? "#2563eb"
                            : viewModel.performance.status === "At Risk"
                              ? "#f59e0b"
                              : viewModel.performance.status === "Off Track"
                                ? "#ef4444"
                                : "#64748b",
                    }}
                    title="Based on projected landing (closed-won + stage-weighted pipeline) vs. target, not raw attainment so far"
                  >
                    {viewModel.performance.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Landing status compares projected revenue ({money(viewModel.performance.forecastRevenue)}) to target — attainment below is how much is closed-won so far.
                </p>

                <Bar
                  pct={(viewModel.performance.attainmentPct ?? 0) * 100}
                  color={viewModel.performance.attainmentPct && viewModel.performance.attainmentPct >= 1 ? "#10b981" : "#2563eb"}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{viewModel.performance.attainmentPct !== null ? `${Math.round(viewModel.performance.attainmentPct * 100)}% of target closed-won` : "No target set"}</span>
                  <span>Target: {money(viewModel.performance.target)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[
                    ["Remaining to target", money(viewModel.performance.remainingRevenue)],
                    ["Weighted pipeline", money(viewModel.performance.weightedPipeline)],
                    ["Forecast revenue", money(viewModel.performance.forecastRevenue)],
                    [
                      "Pipeline coverage",
                      viewModel.performance.pipelineCoverage !== null ? `${viewModel.performance.pipelineCoverage.toFixed(1)}×` : "—",
                    ],
                    ["Days remaining", `${viewModel.performance.daysRemaining} of ${viewModel.performance.daysTotal}`],
                    [
                      "Required run rate",
                      viewModel.performance.requiredDailyRunRate !== null ? `${money(viewModel.performance.requiredDailyRunRate)}/day` : "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[11px] text-slate-500">{label}</div>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1.5">This period: target vs. closed-won vs. forecast</div>
                  <div className="space-y-1.5">
                    {[
                      ["Target", viewModel.performance.target ?? 0, "#94a3b8"],
                      ["Closed won", viewModel.performance.closedWonRevenue, "#10b981"],
                      ["Weighted pipeline", viewModel.performance.weightedPipeline, "#2563eb"],
                      ["Forecast (won + weighted)", viewModel.performance.forecastRevenue, "#7c3aed"],
                    ].map(([label, value, color]) => {
                      const max = Math.max(viewModel.performance.target ?? 0, viewModel.performance.forecastRevenue, 1);
                      return (
                        <div key={label as string} className="flex items-center gap-2 text-xs">
                          <span className="w-36 text-slate-500 truncate">{label}</span>
                          <div className="flex-1">
                            <Bar pct={((value as number) / max) * 100} color={color as string} />
                          </div>
                          <span className="w-24 text-right font-medium text-slate-700">{money(value as number)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    A true actual-vs-target trend over time needs monthly snapshots retained over time — see the roadmap doc.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-700 mb-2">Manual target entry (prototype)</div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Stored per period until HubSpot-native target data is wired up. Editing for: <strong>{period?.label}</strong>.
                </p>
                {currentTargetKey ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">$</span>
                      <input
                        type="number"
                        min={0}
                        value={targetInput}
                        onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleTargetSave}
                      className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2"
                    >
                      Save target
                    </button>
                    {targetSavedAt && <p className="text-[11px] text-emerald-600">Saved at {formatDateTime(targetSavedAt)}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Targets aren&rsquo;t tracked for custom date ranges — pick a standard period to set one.</p>
                )}
              </div>
            </div>
          </Card>

          {/* Section 2: Today's priorities */}
          <Card
            title="Top activities for today"
            subtitle="Ranked by urgency, commercial impact and data quality — max 7"
            icon={<Flame size={16} className="text-orange-500" />}
          >
            {visiblePriorities.length === 0 ? (
              <EmptyState label="Nothing urgent right now — nice work keeping the pipeline healthy." />
            ) : (
              <ol className="space-y-3">
                {visiblePriorities.map((action) => (
                  <li key={action.id} className="rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <span className="flex-none w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                          {action.rank}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{action.subject}</div>
                          <div className="text-sm text-slate-600 mt-0.5">{action.recommendedAction}</div>
                          <div className="text-xs text-slate-400 mt-1">{action.reason}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <HealthPill level={action.urgency} reasons={[action.recommendedAction]} />
                        <span className="text-xs text-slate-500">{action.dueLabel}</span>
                        {action.dealValue !== null && <span className="text-xs font-semibold text-slate-700">{money(action.dealValue)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {action.dealUrl && (
                        <a
                          href={action.dealUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Open in HubSpot <ExternalLink size={11} />
                        </a>
                      )}
                      <button
                        onClick={() => handlePriorityAction(action.id, action.externalId, action.externalType, "COMPLETE")}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle2 size={12} /> Mark complete
                      </button>
                      <button
                        onClick={() => handlePriorityAction(action.id, action.externalId, action.externalType, "SNOOZE")}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Clock3 size={12} /> Snooze 3 days
                      </button>
                      {dismissReasonId === action.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const reason = (e.currentTarget.elements.namedItem("reason") as HTMLInputElement).value;
                            handlePriorityAction(action.id, action.externalId, action.externalType, "DISMISS", reason);
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            name="reason"
                            autoFocus
                            placeholder="Reason for dismissing"
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs w-40"
                          />
                          <button type="submit" className="text-xs font-medium text-slate-700">
                            Confirm
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setDismissReasonId(action.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                          <X size={12} /> Dismiss
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Section 3: My top deals */}
          <Card
            title="My top deals"
            subtitle={`${viewModel.openDealCount} open deals`}
            icon={<TrendingUp size={16} className="text-blue-600" />}
            action={
              <div className="flex flex-wrap gap-1">
                {VIEW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDealView(opt.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border ${
                      dealView === opt.value ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            }
          >
            {sortedDeals.length === 0 ? (
              <EmptyState label="No open deals match this view." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-3">Company / deal</th>
                      <th className="py-2 pr-3">Stage</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 pr-3 text-right">Weighted</th>
                      <th className="py-2 pr-3">Close date</th>
                      <th className="py-2 pr-3">Health</th>
                      <th className="py-2 pr-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeals.map((deal) => (
                      <DealRow
                        key={deal.id}
                        deal={deal}
                        now={nowDate}
                        expanded={expandedDealId === deal.id}
                        onToggle={() => setExpandedDealId(expandedDealId === deal.id ? null : deal.id)}
                        snapshot={snapshot}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Section 4: Deals requiring attention */}
          <Card
            title="Deals requiring attention"
            subtitle="Exception-based — only deals with a real issue appear here"
            icon={<AlertTriangle size={16} className="text-amber-500" />}
          >
            {viewModel.exceptions.length === 0 ? (
              <EmptyState label="No exceptions right now." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {(["Critical", "Needs attention", "Monitor"] as const).map((bucket) => {
                  const items = viewModel.exceptions.filter((e) => e.bucket === bucket);
                  return (
                    <div key={bucket}>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {bucket} ({items.length})
                      </div>
                      <div className="space-y-2">
                        {items.length === 0 && <p className="text-xs text-slate-400">None</p>}
                        {items.map((item) => (
                          <div key={item.deal.id} className="rounded-lg border border-slate-100 p-3">
                            <div className="text-xs font-semibold text-slate-900">{item.deal.companyName}</div>
                            <div className="text-xs text-slate-500 truncate">{item.deal.name}</div>
                            <ul className="text-[11px] text-slate-500 mt-1.5 space-y-0.5">
                              {item.reasons.map((r, i) => (
                                <li key={i}>&bull; {r}</li>
                              ))}
                            </ul>
                            <a href={item.deal.dealUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-medium inline-flex items-center gap-1 mt-2">
                              Open in HubSpot <ExternalLink size={10} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Section 5: HubSpot data gaps */}
          <Card title="HubSpot data gaps" subtitle="Helping you keep an accurate pipeline — not a scorecard" icon={<CheckCircle2 size={16} className="text-emerald-600" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                ["Data completeness", `${viewModel.dataQuality.completenessScore}%`],
                ["Missing critical fields", viewModel.dataQuality.missingCriticalFieldCount],
                ["Stale opportunities", viewModel.dataQuality.staleOpportunityCount],
                ["Overdue close dates", viewModel.dataQuality.overdueCloseDateCount],
                ["No next step", viewModel.dataQuality.noNextStepCount],
                ["No future activity", viewModel.dataQuality.noFutureActivityCount],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className="text-lg font-bold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
            {viewModel.dataQuality.gaps.length === 0 ? (
              <EmptyState label="No data-quality gaps detected." />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                {viewModel.dataQuality.gaps.slice(0, 25).map((gap, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {gap.dealName} <span className="text-slate-400 font-normal">· {gap.field}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{gap.why}</div>
                      <div className="text-xs text-blue-700 mt-0.5">Suggested: {gap.recommendation}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{gap.category}</span>
                      <a href={gap.dealUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-medium inline-flex items-center gap-1">
                        Open <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Data hygiene — contacts & companies */}
          <Card
            title="Data hygiene — contacts & companies"
            subtitle="Record-level gaps on the people and companies behind your deals"
            icon={<ShieldAlert size={16} className="text-amber-600" />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                ["Contacts missing email", viewModel.contactCompanyHygiene.contactsMissingEmail, viewModel.contactCompanyHygiene.contactCount],
                ["Contacts missing job title", viewModel.contactCompanyHygiene.contactsMissingJobTitle, viewModel.contactCompanyHygiene.contactCount],
                ["Companies missing domain", viewModel.contactCompanyHygiene.companiesMissingDomain, viewModel.contactCompanyHygiene.companyCount],
                ["Companies missing industry", viewModel.contactCompanyHygiene.companiesMissingIndustry, viewModel.contactCompanyHygiene.companyCount],
              ].map(([label, value, total]) => (
                <div key={label as string} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className="text-lg font-bold text-slate-900">
                    {value} <span className="text-xs font-normal text-slate-400">of {total}</span>
                  </div>
                </div>
              ))}
            </div>
            {viewModel.contactCompanyHygiene.gaps.length === 0 ? (
              <EmptyState label="No contact or company data-hygiene issues detected." />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                {viewModel.contactCompanyHygiene.gaps.map((gap, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {gap.recordName}{" "}
                        <span className="text-slate-400 font-normal">
                          · {gap.recordType === "contact" ? "Contact" : "Company"} · {gap.field}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{gap.why}</div>
                      <div className="text-xs text-blue-700 mt-0.5">Suggested: {gap.recommendation}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{gap.category}</span>
                      <a href={gap.recordUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 font-medium inline-flex items-center gap-1">
                        Open <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Section 6: Pipeline overview */}
          <Card title="Pipeline overview" icon={<TrendingUp size={16} className="text-purple-600" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Open pipeline by stage</div>
                {viewModel.pipeline.byStage.length === 0 ? (
                  <EmptyState label="No open deals." />
                ) : (
                  <div className="space-y-2">
                    {viewModel.pipeline.byStage.map((s) => (
                      <div key={s.stage} className="flex items-center gap-2 text-xs">
                        <span className="w-32 truncate text-slate-500">{s.label}</span>
                        <div className="flex-1">
                          <Bar pct={(s.amount / Math.max(viewModel.pipeline.totalOpenAmount, 1)) * 100} />
                        </div>
                        <span className="w-24 text-right font-medium text-slate-700">
                          {money(s.amount)} <span className="text-slate-400">({s.count})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Open pipeline by expected close month</div>
                {viewModel.pipeline.byCloseMonth.length === 0 ? (
                  <EmptyState label="No open deals with a close date." />
                ) : (
                  <div className="space-y-2">
                    {viewModel.pipeline.byCloseMonth.map((m) => (
                      <div key={m.monthKey} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-slate-500">{m.label}</span>
                        <div className="flex-1">
                          <Bar pct={(m.amount / Math.max(viewModel.pipeline.totalOpenAmount, 1)) * 100} color="#7c3aed" />
                        </div>
                        <span className="w-24 text-right font-medium text-slate-700">{money(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                ["Unweighted pipeline", money(viewModel.pipeline.totalOpenAmount)],
                ["Weighted pipeline", money(viewModel.pipeline.totalWeightedAmount)],
                ["New opportunities (period)", viewModel.pipeline.newOpportunitiesInPeriod],
                ["Closed-won (period)", `${viewModel.pipeline.closedWonInPeriod.count} · ${money(viewModel.pipeline.closedWonInPeriod.amount)}`],
                ["Closed-lost (period)", `${viewModel.pipeline.closedLostInPeriod.count} · ${money(viewModel.pipeline.closedLostInPeriod.amount)}`],
                ["Avg. closed-won value", viewModel.pipeline.avgClosedWonDealValue !== null ? money(viewModel.pipeline.avgClosedWonDealValue) : "Insufficient data"],
                ["Avg. sales cycle", viewModel.pipeline.avgSalesCycleDays !== null ? `${viewModel.pipeline.avgSalesCycleDays} days` : "Insufficient data"],
                ["Stage conversion rates", "Insufficient data — needs stage-history tracking"],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">{label}</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Section 7: Activity and momentum */}
          <Card title="Activity and momentum" icon={<Calendar size={16} className="text-cyan-600" />}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Recent activity (last 14 days)</div>
                {(snapshot?.engagements ?? []).length === 0 ? (
                  <EmptyState label="No recent activity." />
                ) : (
                  <ul className="space-y-2 text-xs">
                    {(snapshot?.engagements ?? []).map((e) => (
                      <li key={e.id} className="rounded-lg border border-slate-100 p-2.5">
                        <span className="font-medium text-slate-700 capitalize">{e.type}</span> · {formatDate(e.occurredAt)}
                        <div className="text-slate-500">{e.summary}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Overdue tasks ({viewModel.overdueTaskCount})</div>
                {(snapshot?.tasks ?? []).filter((t) => !t.isCompleted).length === 0 ? (
                  <EmptyState label="No open tasks." />
                ) : (
                  <ul className="space-y-2 text-xs">
                    {(snapshot?.tasks ?? [])
                      .filter((t) => !t.isCompleted)
                      .map((t) => (
                        <li key={t.id} className="rounded-lg border border-slate-100 p-2.5">
                          <div className="font-medium text-slate-700">{t.title}</div>
                          <div className="text-slate-500">Due {formatDate(t.dueAt)}</div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Needs activity despite high value</div>
                {(() => {
                  const items = deals.filter(
                    (d) => !d.isClosedWon && !d.isClosedLost && (d.amount ?? 0) >= 150_000 && assessDealHealth(d, nowDate).level !== "green",
                  );
                  if (items.length === 0) return <EmptyState label="No high-value deals are under-engaged." />;
                  return (
                    <ul className="space-y-2 text-xs">
                      {items.map((d) => (
                        <li key={d.id} className="rounded-lg border border-slate-100 p-2.5">
                          <div className="font-medium text-slate-700">
                            {d.companyName} — {money(d.amount)}
                          </div>
                          <div className="text-slate-500">Last activity: {formatDate(d.lastActivityAt)}</div>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* Ask Claude panel */}
          <Card title="Ask Claude about my pipeline" icon={<Sparkles size={16} className="text-blue-600" />}>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "What are the three most important things I should do today?",
                "Which deals are most likely to slip?",
                "Which opportunities could help me close my target gap?",
                "Prepare me for my next customer meeting.",
                "Which records need updating in HubSpot?",
                "Which deals have no credible next step?",
                "Summarise my pipeline for my manager.",
                "Draft a follow-up email for this opportunity.",
                "Challenge my forecast assumptions.",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setAskInput(prompt)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                placeholder="Ask about your pipeline…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button disabled className="rounded-lg bg-slate-100 text-slate-400 px-4 py-2 text-sm font-medium cursor-not-allowed">
                Ask
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Live Q&amp;A isn&rsquo;t wired up yet — this needs an Anthropic API key configured server-side. See the roadmap doc for this step.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function DealRow({
  deal,
  now,
  expanded,
  onToggle,
  snapshot,
}: {
  deal: HubSpotDeal;
  now: Date;
  expanded: boolean;
  onToggle: () => void;
  snapshot: HubSpotSnapshot | null;
}) {
  const health = assessDealHealth(deal, now);
  const stageAge = daysInCurrentStage(deal, now);
  const weighted = weightedAmount(deal);
  const engagements = (snapshot?.engagements ?? []).filter((e) => e.dealId === deal.id);
  const tasks = (snapshot?.tasks ?? []).filter((t) => t.dealId === deal.id);

  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={onToggle}>
        <td className="py-2.5 pr-3">
          <div className="font-medium text-slate-900">{deal.companyName ?? "Unknown company"}</div>
          <div className="text-xs text-slate-500 truncate max-w-[220px]">{deal.name}</div>
        </td>
        <td className="py-2.5 pr-3 text-slate-600">{deal.stageLabel}</td>
        <td className="py-2.5 pr-3 text-right font-medium text-slate-900">{money(deal.amount, deal.currency)}</td>
        <td className="py-2.5 pr-3 text-right text-slate-600">{money(weighted, deal.currency)}</td>
        <td className="py-2.5 pr-3 text-slate-600">{formatDate(deal.closeDate)}</td>
        <td className="py-2.5 pr-3">
          <HealthPill level={health.level} reasons={health.reasons} />
        </td>
        <td className="py-2.5 pr-1 text-slate-400">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/60">
          <td colSpan={7} className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold text-slate-600 mb-1.5">Deal details</div>
                <dl className="space-y-1 text-slate-600">
                  <div className="flex justify-between"><dt>Probability</dt><dd>{deal.probability !== null ? `${Math.round(deal.probability * 100)}%` : "—"}</dd></div>
                  <div className="flex justify-between"><dt>Forecast category</dt><dd className="capitalize">{deal.forecastCategory?.replace("_", " ") ?? "—"}</dd></div>
                  <div className="flex justify-between"><dt>Days in current stage</dt><dd>{stageAge ?? "—"}</dd></div>
                  <div className="flex justify-between"><dt>Last activity</dt><dd>{formatDate(deal.lastActivityAt)}</dd></div>
                  <div className="flex justify-between"><dt>Next activity</dt><dd>{formatDate(deal.nextActivityAt)}</dd></div>
                  <div className="flex justify-between"><dt>Key contact</dt><dd>{deal.primaryContactName ?? "Unknown"}</dd></div>
                </dl>
              </div>
              <div>
                <div className="font-semibold text-slate-600 mb-1.5">Next step &amp; risks</div>
                <p className="text-slate-600 mb-2">{deal.nextStep ?? "No next step recorded — worth clarifying with the customer."}</p>
                <ul className="space-y-1 text-slate-500">
                  {health.reasons.length > 0 ? health.reasons.map((r, i) => <li key={i}>&bull; {r}</li>) : <li>No open risks identified.</li>}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-slate-600 mb-1.5">Recent activity &amp; open tasks</div>
                {engagements.length === 0 && tasks.length === 0 ? (
                  <p className="text-slate-400">Nothing logged.</p>
                ) : (
                  <ul className="space-y-1 text-slate-500">
                    {engagements.map((e) => (
                      <li key={e.id}>
                        {formatDate(e.occurredAt)} — {e.summary}
                      </li>
                    ))}
                    {tasks.map((t) => (
                      <li key={t.id}>Task: {t.title} (due {formatDate(t.dueAt)})</li>
                    ))}
                  </ul>
                )}
                <a href={deal.dealUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 font-medium mt-2">
                  Open deal in HubSpot <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
