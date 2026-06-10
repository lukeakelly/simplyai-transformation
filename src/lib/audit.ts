import { prisma } from "@/lib/prisma";

export type AuditEntry = {
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  summary: string;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      entityName: entry.entityName ?? null,
      summary: entry.summary,
    },
  });
}

export async function getAuditLogs(limit = 500) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
