import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ACTION_STYLES: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700",
  updated: "bg-blue-50 text-blue-700",
  deleted: "bg-red-50 text-red-700",
  checked: "bg-emerald-50 text-emerald-700",
  unchecked: "bg-amber-50 text-amber-700",
  status: "bg-violet-50 text-violet-700",
  moved: "bg-sky-50 text-sky-700",
  reordered: "bg-sky-50 text-sky-700",
  login: "bg-slate-100 text-slate-600",
  logout: "bg-slate-100 text-slate-600",
};

function fmt(d: Date): string {
  return new Date(d).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Admin-only — the activity log is the COO's admin tool.
  if (!session.adminView) redirect("/");

  const logs = await getAuditLogs(1000);

  return (
    <div className="pt-14 lg:pt-0">
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-slate-900">Activity log</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {logs.length} recorded {logs.length === 1 ? "event" : "events"} —
          every change is attributed to the acting role.
        </p>
      </header>

      <div className="p-6">
        <div className="overflow-x-auto scroll-thin rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 w-48">When</th>
                <th className="px-4 py-3 w-40">Role</th>
                <th className="px-4 py-3 w-32">Action</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {fmt(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {log.actorRole}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        ACTION_STYLES[log.action] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.summary}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
