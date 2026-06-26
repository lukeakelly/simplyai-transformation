import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AskClient } from "@/components/AskClient";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AskClient userName={session.name || session.role} />;
}
