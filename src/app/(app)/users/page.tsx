import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Admin-only — user management lives behind the COO's admin tools.
  if (!session.adminView) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      permission: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { comments: true } },
    },
  });

  return (
    <UsersClient
      currentUserId={session.userId}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        permission: u.permission === "viewer" ? "viewer" : "editor",
        isAdmin: u.isAdmin,
        comments: u._count.comments,
      }))}
    />
  );
}
