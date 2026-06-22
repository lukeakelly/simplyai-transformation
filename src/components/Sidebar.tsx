"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  CalendarRange,
  Users,
  BriefcaseBusiness,
  Sparkles,
  Menu,
  X,
  ScrollText,
  UserCog,
  LogOut,
  Eye,
  ShieldCheck,
  ArrowLeftRight,
} from "lucide-react";
import { useState } from "react";
import { logout, setMode } from "@/app/auth-actions";

const BASE_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/timeline", label: "Timeline", icon: CalendarRange },
  { href: "/owners", label: "Owners", icon: Users },
  { href: "/resource-command-centre", label: "Resources", icon: BriefcaseBusiness },
  { href: "/ask", label: "Ask", icon: Sparkles },
];

export function Sidebar({
  role,
  canEdit,
  isAdmin,
  adminView,
}: {
  role: string;
  canEdit: boolean;
  isAdmin: boolean;
  adminView: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = adminView
    ? [
        ...BASE_NAV,
        { href: "/users", label: "Users", icon: UserCog },
        { href: "/activity", label: "Activity", icon: ScrollText },
      ]
    : BASE_NAV;

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-slate-900 text-white px-4 h-14">
        <span className="font-semibold tracking-tight">
          Simplyai Transformation
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          className="p-2 rounded-md hover:bg-white/10"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-6 border-b border-white/10">
          <div className="text-lg font-bold text-white tracking-tight">
            Simplyai
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Transformation Control
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">
                Signed in as
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {role}
              </div>
            </div>
            {!canEdit && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                <Eye size={12} /> Read-only
              </span>
            )}
          </div>

          {isAdmin && (
            <form action={setMode.bind(null, adminView ? "coo" : "admin")}>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
              >
                {adminView ? (
                  <>
                    <ArrowLeftRight size={13} /> Switch to COO view
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} /> Open admin tools
                  </>
                )}
              </button>
            </form>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={13} /> Log out
            </button>
          </form>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
