"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/app/actions";

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

function normUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export type CreateUserInput = {
  name: string;
  username: string;
  password: string;
  role: string;
  permission: "editor" | "viewer";
  isAdmin: boolean;
};

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  const session = await requireAdmin();

  const name = input.name.trim();
  const username = normUsername(input.username);
  const password = input.password;
  const role = input.role.trim();
  const permission = input.permission === "viewer" ? "viewer" : "editor";

  if (!name) return { ok: false, error: "Please enter a name." };
  if (!username) return { ok: false, error: "Please enter a username." };
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      ok: false,
      error: "Username can only contain letters, numbers, dots, dashes and underscores.",
    };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!role) return { ok: false, error: "Please enter a role label." };

  try {
    await prisma.user.create({
      data: {
        name,
        username,
        passwordHash: hashPassword(password),
        role,
        permission,
        isAdmin: input.isAdmin,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, error: `Username "${username}" is already taken.` };
    }
    throw e;
  }

  await logAudit({
    actorRole: session.role,
    action: "created",
    entityType: "user",
    entityName: name,
    summary: `Created ${permission === "viewer" ? "comment-only" : "editor"} user "${name}" (@${username}, ${role})`,
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function renameUser(
  userId: string,
  name: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const newName = name.trim();
  if (!newName) return { ok: false, error: "Please enter a name." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  await prisma.user.update({ where: { id: userId }, data: { name: newName } });
  await logAudit({
    actorRole: session.role,
    action: "updated",
    entityType: "user",
    entityName: newName,
    summary: `Renamed user @${user.username} from "${user.name || "(unnamed)"}" to "${newName}"`,
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserAccess(
  userId: string,
  permission: "editor" | "viewer",
): Promise<ActionResult> {
  const session = await requireAdmin();
  const perm = permission === "viewer" ? "viewer" : "editor";

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  if (user.id === session.userId) {
    return { ok: false, error: "You cannot change your own access level." };
  }

  await prisma.user.update({ where: { id: userId }, data: { permission: perm } });
  await logAudit({
    actorRole: session.role,
    action: "updated",
    entityType: "user",
    entityName: user.name || user.username,
    summary: `Set ${user.name || "@" + user.username} access to ${perm === "viewer" ? "comment-only" : "editor"}`,
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(password) },
  });
  await logAudit({
    actorRole: session.role,
    action: "updated",
    entityType: "user",
    entityName: user.name || user.username,
    summary: `Reset password for ${user.name || "@" + user.username}`,
  });
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };
  if (user.id === session.userId) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  await prisma.user.delete({ where: { id: userId } });
  await logAudit({
    actorRole: session.role,
    action: "deleted",
    entityType: "user",
    entityName: user.name || user.username,
    summary: `Removed user ${user.name || "@" + user.username} (@${user.username})`,
  });
  revalidatePath("/users");
  return { ok: true };
}
