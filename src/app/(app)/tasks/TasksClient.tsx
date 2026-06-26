"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Check } from "lucide-react";
import { StatusBadge, PriorityBadge, Pill, OriginBadge } from "@/components/Badges";
import { TaskDrawer } from "@/components/TaskDrawer";
import { STATUSES, PRIORITIES, DONE_STATUSES } from "@/lib/constants";
import {
  toggleTaskDone,
  setTaskStatus,
  updateTask,
} from "@/app/actions";
import type {
  TaskWithRelations,
  HorizonRecord,
  PersonRecord,
} from "@/lib/data";

type Props = {
  tasks: TaskWithRelations[];
  horizons: HorizonRecord[];
  people: PersonRecord[];
  workstreams: string[];
  canEdit: boolean;
  currentUserName: string;
  initialPriority?: string;
  initialOrigin?: string;
};

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none";

export function TasksClient({
  tasks,
  horizons,
  people,
  workstreams,
  canEdit,
  currentUserName,
  initialPriority = "",
  initialOrigin = "",
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [fWorkstream, setFWorkstream] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPriority, setFPriority] = useState(initialPriority);
  const [fHorizon, setFHorizon] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fOrigin, setFOrigin] = useState(initialOrigin);
  const [hideDone, setHideDone] = useState(false);

  const [selected, setSelected] = useState<TaskWithRelations | null>(null);
  const [drawerNew, setDrawerNew] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q) {
        const hay = `${t.itemId ?? ""} ${t.title} ${t.workstream} ${
          t.category ?? ""
        } ${t.output ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fWorkstream && t.workstream !== fWorkstream) return false;
      if (fStatus && t.status !== fStatus) return false;
      if (fPriority && t.priority !== fPriority) return false;
      if (fHorizon && (t.horizonId ?? "") !== fHorizon) return false;
      if (fOwner && (t.ownerId ?? "") !== fOwner) return false;
      if (fOrigin && t.origin !== fOrigin) return false;
      if (hideDone && DONE_STATUSES.has(t.status)) return false;
      return true;
    });
  }, [
    tasks,
    search,
    fWorkstream,
    fStatus,
    fPriority,
    fHorizon,
    fOwner,
    fOrigin,
    hideDone,
  ]);

  function refresh() {
    router.refresh();
  }

  function openTask(t: TaskWithRelations) {
    setSelected(t);
    setDrawerNew(false);
    setDrawerOpen(true);
  }
  function openNew() {
    setSelected(null);
    setDrawerNew(true);
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    setDrawerNew(false);
  }

  const horizonName = (id: string | null) =>
    horizons.find((h) => h.id === id)?.name ?? null;
  const horizonColor = (id: string | null) =>
    horizons.find((h) => h.id === id)?.color ?? "#64748b";

  return (
    <div className="pt-14 lg:pt-0">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {tasks.length} items
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} /> New task
          </button>
        )}
      </header>

      {/* Filters */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-sm w-56 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          className={selectCls}
          value={fWorkstream}
          onChange={(e) => setFWorkstream(e.target.value)}
        >
          <option value="">All workstreams</option>
          {workstreams.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fPriority}
          onChange={(e) => setFPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fHorizon}
          onChange={(e) => setFHorizon(e.target.value)}
        >
          <option value="">All horizons</option>
          {horizons.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fOwner}
          onChange={(e) => setFOwner(e.target.value)}
        >
          <option value="">All owners</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className={selectCls}
          value={fOrigin}
          onChange={(e) => setFOrigin(e.target.value)}
          title="Filter by source"
        >
          <option value="">Dora + Transformation</option>
          <option value="Dora">Dora only</option>
          <option value="Transformation Plan (only)">
            Transformation Plan (only)
          </option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-1">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="accent-blue-600"
          />
          Hide completed
        </label>
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="overflow-x-auto scroll-thin rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-3 w-10"></th>
                <th className="px-3 py-3 w-20">ID</th>
                <th className="px-3 py-3 min-w-[280px]">Task</th>
                <th className="px-3 py-3">Owner</th>
                <th className="px-3 py-3">Priority</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Horizon</th>
                <th className="px-3 py-3 w-28">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const done = DONE_STATUSES.has(t.status);
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => openTask(t)}
                  >
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        aria-label="Toggle done"
                        disabled={!canEdit}
                        onClick={() =>
                          canEdit &&
                          startTransition(async () => {
                            await toggleTaskDone(t.id, !done);
                            refresh();
                          })
                        }
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                          done
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 hover:border-emerald-400"
                        } ${canEdit ? "" : "cursor-default opacity-80"}`}
                      >
                        {done && <Check size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-400">
                      {t.itemId ?? "\u2014"}
                    </td>
                    <td className="px-3 py-3">
                      <div
                        className={`font-medium ${
                          done
                            ? "text-slate-400 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {t.origin === "Dora" && <OriginBadge origin={t.origin} />}
                        <span className="text-xs text-slate-400">
                          {t.workstream}
                          {t.category ? ` \u00b7 ${t.category}` : ""}
                        </span>
                        {t.comments.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {"\u00b7"} {t.comments.length} comment
                            {t.comments.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <select
                          className="rounded-md border border-transparent hover:border-slate-300 bg-transparent px-1 py-1 text-sm text-slate-700 focus:border-blue-500 focus:outline-none max-w-[150px]"
                          value={t.ownerId ?? ""}
                          onChange={(e) =>
                            startTransition(async () => {
                              await updateTask(t.id, {
                                ownerId: e.target.value || null,
                              });
                              refresh();
                            })
                          }
                        >
                          <option value="">Unassigned</option>
                          {people.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-slate-700">
                          {t.owner?.name ?? (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <StatusSelect
                          value={t.status}
                          onChange={(s) =>
                            startTransition(async () => {
                              await setTaskStatus(t.id, s);
                              refresh();
                            })
                          }
                        />
                      ) : (
                        <StatusBadge status={t.status} />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {t.horizonId ? (
                        <Pill color={horizonColor(t.horizonId)}>
                          {horizonName(t.horizonId)}
                        </Pill>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Unscheduled
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden min-w-[40px]">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${t.completion}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-400 w-8 text-right">
                          {t.completion}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-12 text-center text-slate-400"
                  >
                    No tasks match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <TaskDrawer
          key={selected?.id ?? "new"}
          task={selected}
          isNew={drawerNew}
          canEdit={canEdit}
          currentUserName={currentUserName}
          horizons={horizons}
          people={people}
          workstreams={workstreams}
          onClose={closeDrawer}
          onSaved={() => {
            closeDrawer();
            refresh();
          }}
          onCommented={refresh}
        />
      )}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      <StatusBadge status={value} />
      <select
        aria-label="Change status"
        title="Change status"
        className="absolute inset-0 w-full cursor-pointer opacity-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
