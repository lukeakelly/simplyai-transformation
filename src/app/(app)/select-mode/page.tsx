import { redirect } from "next/navigation";
import { ShieldCheck, Briefcase } from "lucide-react";
import { getSession } from "@/lib/auth";
import { setMode } from "@/app/auth-actions";

export const dynamic = "force-dynamic";

export default async function SelectModePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-xl font-bold text-slate-900 text-center">
          How do you want to continue?
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1">
          You can switch at any time.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <form action={setMode.bind(null, "coo")}>
            <button
              type="submit"
              className="w-full h-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:border-blue-400 hover:shadow-md transition"
            >
              <Briefcase className="text-blue-600" size={24} />
              <div className="mt-3 font-semibold text-slate-900">
                {session.role} workspace
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Manage tasks, the timeline and owners.
              </div>
            </button>
          </form>

          <form action={setMode.bind(null, "admin")}>
            <button
              type="submit"
              className="w-full h-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:border-blue-400 hover:shadow-md transition"
            >
              <ShieldCheck className="text-slate-800" size={24} />
              <div className="mt-3 font-semibold text-slate-900">
                Admin tools
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Everything in the workspace, plus the activity log.
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
