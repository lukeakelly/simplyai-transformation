"use client";

import { useState, useTransition } from "react";
import { X, Trash2, Save } from "lucide-react";
import {
  STATUSES,
  PRIORITIES,
  ARTEFACT_TYPES,
  RECURRENCE,
} from "@/lib/constants";
import {
  createTask,
  updateTask,
  deleteTask,
  type TaskInput,
} from "@/app/actions";
import type {
  TaskWithRelations,
  HorizonRecord,
  PersonRecord,
} from "@/lib/data";

type Props = {
  task: TaskWithRelations | null;
  isNew: boolean;
  canEdit: boolean;
  horizons: HorizonRecord[];
  people: PersonRecord[];
  workstreams: string[];
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  title: string;
  workstream: string;
  category: string;
  description: string;
  whyItMatters: string;
  output: string;
  artefactType: string;
  ownerId: string;
  accountableId: string;
  contributors: string;
  priority: string;
  horizonId: string;
  targetDate: string;
  status: string;
  completion: number;
  recurrence: string;
  cadence: string;
  dependencies: string;
  risks: string;
  evidence: string;
  doneCriteria: string;
  source: string;
  notes: string;
};

function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function initState(task: TaskWithRelations | null, fallbackWs: string): FormState {
  return {
    title: task?.title ?? "",
    workstream: task?.workstream ?? fallbackWs ?? "",
    category: task?.category ?? "",
    description: task?.description ?? "",
    whyItMatters: task?.whyItMatters ?? "",
    output: task?.output ?? "",
    artefactType: task?.artefactType ?? "",
    ownerId: task?.ownerId ?? "",
    accountableId: task?.accountableId ?? "",
    contributors: task?.contributors ?? "",
    priority: task?.priority ?? "",
    horizonId: task?.horizonId ?? "",
    targetDate: toDateInput(task?.targetDate),
    status: task?.status ?? "Not Started",
    completion: task?.completion ?? 0,
    recurrence: task?.recurrence ?? "",
    cadence: task?.cadence ?? "",
    dependencies: task?.dependencies ?? "",
    risks: task?.risks ?? "",
    evidence: task?.evidence ?? "",
    doneCriteria: task?.doneCriteria ?? "",
    source: task?.source ?? "",
    notes: task?.notes ?? "",
  };
}

const labelCls = "block text-xs font-semibold text-slate-500 mb-1";
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function TaskDrawer({
  task,
  isNew,
  canEdit,
  horizons,
  people,
  workstreams,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(() =>
    initState(task, workstreams[0] ?? ""),
  );
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const payload: TaskInput = {
      ...form,
      category: form.category || null,
      description: form.description || null,
      whyItMatters: form.whyItMatters || null,
      output: form.output || null,
      artefactType: form.artefactType || null,
      ownerId: form.ownerId || null,
      accountableId: form.accountableId || null,
      contributors: form.contributors || null,
      priority: form.priority || null,
      horizonId: form.horizonId || null,
      targetDate: form.targetDate || null,
      recurrence: form.recurrence || null,
      cadence: form.cadence || null,
      dependencies: form.dependencies || null,
      risks: form.risks || null,
      evidence: form.evidence || null,
      doneCriteria: form.doneCriteria || null,
      source: form.source || null,
      notes: form.notes || null,
    };
    startTransition(async () => {
      if (isNew) {
        await createTask(payload);
      } else if (task) {
        await updateTask(task.id, payload);
      }
      onSaved();
    });
  }

  function handleDelete() {
    if (!task) return;
    if (!confirm("Delete this task? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full overflow-y-auto scroll-thin shadow-xl flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-400">
              {task?.itemId ?? (isNew ? "New task" : "Task")}
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {isNew ? "Log a new task" : task?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <fieldset disabled={!canEdit} className="px-6 py-5 space-y-5 flex-1">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Checklist item"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Workstream</label>
              <input
                className={inputCls}
                list="workstream-options"
                value={form.workstream}
                onChange={(e) => set("workstream", e.target.value)}
              />
              <datalist id="workstream-options">
                {workstreams.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input
                className={inputCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select
                className={inputCls}
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                <option value="">&mdash;</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Owner</label>
              <select
                className={inputCls}
                value={form.ownerId}
                onChange={(e) => set("ownerId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Accountable executive</label>
              <select
                className={inputCls}
                value={form.accountableId}
                onChange={(e) => set("accountableId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Horizon</label>
              <select
                className={inputCls}
                value={form.horizonId}
                onChange={(e) => set("horizonId", e.target.value)}
              >
                <option value="">Unscheduled</option>
                {horizons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Target date</label>
              <input
                type="date"
                className={inputCls}
                value={form.targetDate}
                onChange={(e) => set("targetDate", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Completion &mdash; {form.completion}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              className="w-full accent-blue-600"
              value={form.completion}
              onChange={(e) => set("completion", Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Recurrence</label>
              <select
                className={inputCls}
                value={form.recurrence}
                onChange={(e) => set("recurrence", e.target.value)}
              >
                <option value="">&mdash;</option>
                {RECURRENCE.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Cadence (if recurring)</label>
              <input
                className={inputCls}
                value={form.cadence}
                onChange={(e) => set("cadence", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Artefact type</label>
              <input
                className={inputCls}
                list="artefact-options"
                value={form.artefactType}
                onChange={(e) => set("artefactType", e.target.value)}
              />
              <datalist id="artefact-options">
                {ARTEFACT_TYPES.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Contributors</label>
              <input
                className={inputCls}
                value={form.contributors}
                onChange={(e) => set("contributors", e.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Detailed description"
            value={form.description}
            onChange={(v) => set("description", v)}
          />
          <Textarea
            label="Why it matters"
            value={form.whyItMatters}
            onChange={(v) => set("whyItMatters", v)}
          />
          <Textarea
            label="Required output / artefact"
            value={form.output}
            onChange={(v) => set("output", v)}
          />
          <Textarea
            label="Dependencies"
            value={form.dependencies}
            onChange={(v) => set("dependencies", v)}
          />
          <Textarea
            label="Risks if not completed"
            value={form.risks}
            onChange={(v) => set("risks", v)}
          />
          <Textarea
            label="Evidence required"
            value={form.evidence}
            onChange={(v) => set("evidence", v)}
          />
          <Textarea
            label="Acceptance / done criteria"
            value={form.doneCriteria}
            onChange={(v) => set("doneCriteria", v)}
          />
          <Textarea
            label="Source / rationale"
            value={form.source}
            onChange={(v) => set("source", v)}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(v) => set("notes", v)}
          />
        </fieldset>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          {canEdit ? (
            <>
              {!isNew ? (
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  <Trash2 size={16} /> Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={pending || !form.title.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {pending ? "Saving\u2026" : isNew ? "Create task" : "Save changes"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span />
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea
        className={`${inputCls} min-h-[60px] resize-y`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
