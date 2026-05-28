"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserRound, Pencil, X } from "lucide-react";
import {
  createPerson,
  updatePerson,
  deletePerson,
} from "@/app/actions";

type Summary = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  owned: number;
  accountable: number;
  done: number;
  avg: number;
};

export function OwnersClient({
  summary,
  unassigned,
}: {
  summary: Summary[];
  unassigned: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createPerson({ name, title: title || null, email: email || null });
      setName("");
      setTitle("");
      setEmail("");
      setAdding(false);
      router.refresh();
    });
  }

  function remove(id: string, label: string) {
    if (!confirm(`Remove ${label}? They will be unassigned from all tasks.`))
      return;
    startTransition(async () => {
      await deletePerson(id);
      router.refresh();
    });
  }

  return (
    <div className="pt-14 lg:pt-0">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owners</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {summary.length} owners &middot; {unassigned} tasks unassigned
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={16} /> Add owner
        </button>
      </header>

      <div className="p-6 space-y-4">
        {adding && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-end gap-3">
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Title / role" value={title} onChange={setTitle} />
            <Field label="Email" value={email} onChange={setEmail} />
            <button
              onClick={add}
              disabled={!name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {summary.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
            >
              {editId === p.id ? (
                <InlineEdit
                  person={p}
                  onCancel={() => setEditId(null)}
                  onSaved={() => {
                    setEditId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <UserRound size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {p.name}
                        </div>
                        {p.title && p.title !== p.name && (
                          <div className="text-xs text-slate-400 truncate">
                            {p.title}
                          </div>
                        )}
                        {p.email && (
                          <div className="text-xs text-slate-400 truncate">
                            {p.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditId(p.id)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
                        aria-label="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(p.id, p.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <Stat label="Owns" value={p.owned} />
                    <Stat label="Accountable" value={p.accountable} />
                    <Stat label="Done" value={p.done} />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Avg. completion</span>
                      <span>{p.avg}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${p.avg}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function Field({
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
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

function InlineEdit({
  person,
  onCancel,
  onSaved,
}: {
  person: Summary;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(person.name);
  const [title, setTitle] = useState(person.title ?? "");
  const [email, setEmail] = useState(person.email ?? "");

  function save() {
    startTransition(async () => {
      await updatePerson(person.id, {
        name,
        title: title || null,
        email: email || null,
      });
      onSaved();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Edit owner</span>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-slate-100 text-slate-400"
        >
          <X size={15} />
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title / role"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        onClick={save}
        disabled={!name.trim()}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}
