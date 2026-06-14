"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ShieldCheck,
  Eye,
  Pencil,
  KeyRound,
  Trash2,
  X,
  Check,
} from "lucide-react";
import {
  createUser,
  renameUser,
  setUserAccess,
  resetUserPassword,
  deleteUser,
} from "@/app/admin-actions";

type UserRow = {
  id: string;
  name: string;
  username: string;
  role: string;
  permission: "editor" | "viewer";
  isAdmin: boolean;
  comments: number;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

export function UsersClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // create form
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [permission, setPermission] = useState<"editor" | "viewer">("viewer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setUsername("");
    setPassword("");
    setRole("");
    setPermission("viewer");
    setIsAdmin(false);
    setError(null);
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createUser({
        name,
        username,
        password,
        role,
        permission,
        isAdmin,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      resetForm();
      setAdding(false);
      router.refresh();
    });
  }

  function remove(u: UserRow) {
    if (
      !confirm(
        `Remove ${u.name || u.username}? They will no longer be able to log in. Their past comments are kept.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteUser(u.id);
      if (!res.ok) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="pt-14 lg:pt-0">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {users.length} accounts &middot; comments are attributed to the
            logged-in user
          </p>
        </div>
        <button
          onClick={() => {
            setAdding((v) => !v);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <UserPlus size={16} /> Add user
        </button>
      </header>

      <div className="p-6 space-y-4">
        {adding && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full name</label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wayne Smith"
                />
              </div>
              <div>
                <label className={labelCls}>Username</label>
                <input
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. wayne"
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="at least 8 characters"
                />
              </div>
              <div>
                <label className={labelCls}>Role label</label>
                <input
                  className={inputCls}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Reviewer, Finance Manager"
                />
              </div>
              <div>
                <label className={labelCls}>Access</label>
                <select
                  className={inputCls}
                  value={permission}
                  onChange={(e) =>
                    setPermission(e.target.value as "editor" | "viewer")
                  }
                >
                  <option value="viewer">Comment-only (read-only)</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                  />
                  Admin (can manage users &amp; see activity log)
                </label>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={add}
                disabled={!name.trim() || !username.trim() || !role.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create user
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  resetForm();
                }}
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto scroll-thin rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Comments</th>
                <th className="px-4 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <UserRowView
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  editing={editId === u.id}
                  onEdit={() => setEditId(u.id)}
                  onDoneEditing={() => {
                    setEditId(null);
                    router.refresh();
                  }}
                  onRemove={() => remove(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserRowView({
  user,
  isSelf,
  editing,
  onEdit,
  onDoneEditing,
  onRemove,
}: {
  user: UserRow;
  isSelf: boolean;
  editing: boolean;
  onEdit: () => void;
  onDoneEditing: () => void;
  onRemove: () => void;
}) {
  const [, startTransition] = useTransition();
  const [nameDraft, setNameDraft] = useState(user.name);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function saveName() {
    setMsg(null);
    startTransition(async () => {
      const res = await renameUser(user.id, nameDraft);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      onDoneEditing();
    });
  }

  function toggleAccess() {
    startTransition(async () => {
      const res = await setUserAccess(
        user.id,
        user.permission === "editor" ? "viewer" : "editor",
      );
      if (!res.ok) {
        alert(res.error);
        return;
      }
      onDoneEditing();
    });
  }

  function savePassword() {
    setMsg(null);
    startTransition(async () => {
      const res = await resetUserPassword(user.id, pw);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setPw("");
      setPwOpen(false);
      setMsg("Password updated.");
    });
  }

  return (
    <tr className="hover:bg-slate-50 align-top">
      <td className="px-4 py-3 font-medium text-slate-800">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <button
              onClick={saveName}
              className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
              aria-label="Save name"
            >
              <Check size={15} />
            </button>
            <button
              onClick={onDoneEditing}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Cancel"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {user.name || (
              <span className="italic text-slate-400">(unnamed)</span>
            )}
            {user.isAdmin && (
              <ShieldCheck size={13} className="text-violet-500" />
            )}
          </span>
        )}
        {msg && <div className="mt-1 text-xs text-slate-500">{msg}</div>}
      </td>
      <td className="px-4 py-3 text-slate-500">@{user.username}</td>
      <td className="px-4 py-3 text-slate-700">{user.role}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            user.permission === "viewer"
              ? "bg-slate-100 text-slate-600"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {user.permission === "viewer" ? (
            <>
              <Eye size={12} /> Comment-only
            </>
          ) : (
            "Editor"
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500">{user.comments}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {!editing && (
            <button
              onClick={onEdit}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              title="Edit name"
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            onClick={() => setPwOpen((v) => !v)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            title="Reset password"
          >
            <KeyRound size={15} />
          </button>
          {!isSelf && (
            <>
              <button
                onClick={toggleAccess}
                className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                title="Toggle access level"
              >
                Make {user.permission === "editor" ? "comment-only" : "editor"}
              </button>
              <button
                onClick={onRemove}
                className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                title="Remove user"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
        {pwOpen && (
          <div className="mt-2 flex items-center justify-end gap-1">
            <input
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
              placeholder="New password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <button
              onClick={savePassword}
              disabled={pw.length < 8}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
