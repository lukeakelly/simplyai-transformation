import Link from "next/link";
import { getDashboardStats, getHorizons } from "@/lib/data";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/lib/constants";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  AlertTriangle,
  Target,
  ListChecks,
  Sparkles,
  Zap,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon size={18} className={accent} />
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function FilterTile({
  label,
  value,
  sub,
  href,
  icon: Icon,
  iconClass,
  ring,
}: {
  label: string;
  value: string | number;
  sub: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  ring: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 ${ring}`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon size={20} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-700">{label}</div>
          <div className="mt-0.5 text-3xl font-bold text-slate-900">
            {value}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
        </div>
      </div>
      <span className="flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-slate-600">
        View
        <ChevronRight size={16} />
      </span>
    </Link>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-44 shrink-0 truncate text-slate-600" title={label}>
        {label}
      </span>
      <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right tabular-nums text-slate-500">
        {value}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, horizons] = await Promise.all([
    getDashboardStats(),
    getHorizons(),
  ]);

  const horizonOrder = horizons.map((h) => h.name);
  const horizonEntries = [
    ...horizonOrder
      .filter((n) => n in stats.byHorizon)
      .map((n) => [n, stats.byHorizon[n]] as const),
    ...Object.entries(stats.byHorizon).filter(
      ([n]) => !horizonOrder.includes(n),
    ),
  ];
  const horizonColor = new Map(horizons.map((h) => [h.name, h.color]));

  const topWorkstreams = Object.entries(stats.byWorkstream).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="pt-14 lg:pt-0">
      <header className="bg-white border-b border-slate-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Transformation Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Live control view of the Simplyai transformation programme &mdash;{" "}
          {stats.total} tracked items.
        </p>
      </header>

      <div className="p-6 space-y-6">
        {/* Top metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label="Total items"
            value={stats.total}
            icon={ListChecks}
            accent="text-slate-400"
          />
          <StatCard
            label="Overall progress"
            value={`${stats.completion}%`}
            sub="Avg. completion"
            icon={Target}
            accent="text-blue-500"
          />
          <StatCard
            label="Completed"
            value={stats.done}
            sub="Approved / Embedded"
            icon={CheckCircle2}
            accent="text-emerald-500"
          />
          <StatCard
            label="In progress"
            value={stats.inProgress}
            icon={Loader2}
            accent="text-blue-500"
          />
          <StatCard
            label="Not started"
            value={stats.notStarted}
            icon={CircleDashed}
            accent="text-slate-400"
          />
          <StatCard
            label="At risk / blocked"
            value={stats.atRisk}
            icon={AlertTriangle}
            accent="text-orange-500"
          />
        </div>

        {/* Focused, clickable views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FilterTile
            label="Dora items"
            value={stats.doraTotal}
            sub={`${stats.doraCompletion}% avg. completion \u00b7 from Project Dora`}
            href="/tasks?origin=Dora"
            icon={Sparkles}
            iconClass="bg-purple-100 text-purple-600"
            ring="border-purple-200"
          />
          <FilterTile
            label="Critical path"
            value={stats.criticalTotal}
            sub={`${stats.criticalDone} of ${stats.criticalTotal} complete \u00b7 highest priority`}
            href="/tasks?priority=Critical+Path"
            icon={Zap}
            iconClass="bg-red-100 text-red-600"
            ring="border-red-200"
          />
        </div>

        {/* Critical path progress */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">
              Critical path progress
            </h2>
            <span className="text-sm text-slate-500">
              {stats.criticalDone} of {stats.criticalTotal} complete
            </span>
          </div>
          <div className="h-4 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500 transition-all"
              style={{
                width: `${
                  stats.criticalTotal === 0
                    ? 0
                    : Math.round(
                        (stats.criticalDone / stats.criticalTotal) * 100,
                      )
                }%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By status */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">By status</h2>
            <div className="space-y-2.5">
              {Object.entries(stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => (
                  <BarRow
                    key={label}
                    label={label}
                    value={value}
                    total={stats.total}
                    color={STATUS_COLORS[label] ?? "#94a3b8"}
                  />
                ))}
            </div>
          </div>

          {/* By priority */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">By priority</h2>
            <div className="space-y-2.5">
              {Object.entries(stats.byPriority)
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => (
                  <BarRow
                    key={label}
                    label={label}
                    value={value}
                    total={stats.total}
                    color={PRIORITY_COLORS[label] ?? "#94a3b8"}
                  />
                ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By horizon */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">By horizon</h2>
            <div className="space-y-2.5">
              {horizonEntries.map(([label, value]) => (
                <BarRow
                  key={label}
                  label={label}
                  value={value}
                  total={stats.total}
                  color={horizonColor.get(label) ?? "#2563eb"}
                />
              ))}
            </div>
          </div>

          {/* By workstream */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">
              By workstream
            </h2>
            <div className="space-y-2.5 max-h-96 overflow-y-auto scroll-thin pr-1">
              {topWorkstreams.map(([label, value]) => (
                <BarRow
                  key={label}
                  label={label}
                  value={value}
                  total={stats.total}
                  color="#6366f1"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
