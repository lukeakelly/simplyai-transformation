import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-white tracking-tight">
            Simplyai
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Transformation Control
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-lg font-bold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-5">
            Use the credentials for your role.
          </p>
          <button
            type="button"
            disabled
            className="mb-4 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500"
            title="Configure SSO_PROVIDER, SSO_CLIENT_ID, SSO_CLIENT_SECRET and SSO_ISSUER_URL to enable."
          >
            Sign in with SSO — configuration required
          </button>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
