"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
  type Mode,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid username or password." };
  }

  await setSessionCookie(user.id, "coo");
  await logAudit({
    actorRole: user.role,
    action: "login",
    entityType: "session",
    summary: `${user.role} signed in`,
  });

  if (user.isAdmin) redirect("/select-mode");
  redirect("/");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    await logAudit({
      actorRole: session.role,
      action: "logout",
      entityType: "session",
      summary: `${session.role} signed out`,
    });
  }
  await clearSessionCookie();
  redirect("/login");
}

export async function setMode(mode: Mode): Promise<void> {
  const session = await getSession();
  if (!session || !session.isAdmin) redirect("/");
  await setSessionCookie(session!.userId, mode === "admin" ? "admin" : "coo");
  redirect("/");
}
