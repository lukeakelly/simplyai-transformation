import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.resourceOutboundEvent.findMany({
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return Response.json({
    schemaVersion: "mlvizz-resource-v1",
    feed: "resource-app-planning-outbound",
    generatedAt: new Date().toISOString(),
    records: events.map((event) => ({
      eventId: event.id,
      eventType: event.eventType,
      sourceRecordId: event.sourceRecordId,
      status: event.status,
      correlationId: event.correlationId,
      createdAt: event.createdAt.toISOString(),
      publishedAt: event.publishedAt?.toISOString() ?? null,
      payload: event.payload,
    })),
  });
}
