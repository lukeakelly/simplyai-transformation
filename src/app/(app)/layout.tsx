import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={session.role}
        canEdit={session.canEdit}
        isAdmin={session.isAdmin}
        adminView={session.adminView}
      />
      <main className="flex-1 min-w-0 lg:pl-64">{children}</main>
    </div>
  );
}
