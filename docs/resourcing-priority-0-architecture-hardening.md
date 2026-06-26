# Resourcing Priority 0 architecture hardening

This document records the first implementation slice after the architecture review. It intentionally avoids material database schema changes and preserves the current Resource Command Centre UI while introducing a durable v2 domain contract and deterministic calculation surface.

## Scope implemented in this pass

1. Add `resource-planning-v2` TypeScript contracts for the concepts that must not be collapsed into one status field:
   - resource demand
   - soft and hard bookings
   - named assignments
   - timesheet actuals
   - finance actuals
   - commercial authority and commercial-risk overlays
   - effective capacity projections
   - governed internal work categories
   - scenarios
   - exception thresholds/actions
   - structured attention signals
   - Simplyai capability profiles
2. Add pure calculation functions for:
   - effective capacity
   - hard-booked capacity
   - soft-booked capacity
   - residual bench exposure
   - confirmed demand
   - tentative demand
   - weighted pipeline demand
   - non-recoverable internal capacity
   - commercially authorised work
   - work underway at risk
   - derived attention signals with status text, reason, source evidence and recommended action
3. Add deterministic contract tests proving that:
   - approved leave reduces effective capacity
   - hard bookings reduce bench exposure
   - soft bookings remain visible but do not reduce bench exposure
   - commercial-risk conditions are overlays, not resource statuses
   - attention signals are presentation-level objects with evidence and recommendations
4. Add ADRs for the booking model, commercial-risk overlay and MLVizz integration pattern.

## Non-goals

- No Prisma migration in this pass.
- No destructive migration of existing `ResourcePlannedAllocation` data.
- No UI rewrite.
- No direct point-to-point integrations with HubSpot, Employment Hero, Astute or Xero.
- No change to the seven-year historical actuals archive boundary.

## MLVizz publish pattern

Resource-app-owned planning data should be published to MLVizz using `ResourcePlanningSourceDataEnvelope`:

```ts
{
  schemaVersion: "resource-planning-v2",
  aggregateType: "booking",
  aggregateId: "booking-123",
  operation: "updated",
  idempotencyKey: "booking-123:42",
  sourceEventSequence: 42,
  occurredAt: "2026-07-06T01:00:00.000Z",
  correlationId: "resource-app-save-abc",
  payload: booking
}
```

The envelope makes app-owned changes replayable and idempotent. MLVizz remains the governed canonical boundary for enterprise reference data, while the resource app remains the source of record for live planning constructs.

## Migration map

| Current object | v2 target | Migration note |
| --- | --- | --- |
| `ResourcePlannedAllocation.status = Tentative/Requested` | `BookingV2.bookingStrength = soft` | Does not reduce bench unless explicitly promoted to hard. |
| `ResourcePlannedAllocation.status = Confirmed/At Risk` | `BookingV2.bookingStrength = hard` + `NamedAssignmentV2` when person/project named | `At Risk` becomes a commercial overlay, not a booking status. |
| `ResourcePlannedAllocation.allocationType = Internal` | `NamedAssignmentV2.workClass = governed_internal` + `InternalWorkCategory` | Must retain non-recoverable capacity visibility. |
| `ResourceComment` | unchanged conceptually | Expand target types to v2 aggregates before schema migration. |
| `ResourceOutboundEvent` | `ResourcePlanningSourceDataEnvelope` | Add schema version, aggregate type and idempotency key to publish envelope. |
| `ResourceAllocationHistory` | allocation change/audit stream | Preserve as reconciliation evidence and promotion history. |

## Next implementation sequence

1. Wire existing UI mappers to emit v2-compatible derived objects in parallel with current v1 view models.
2. Add read-only UI diagnostics that compare old KPI outcomes with v2 calculations.
3. Add Prisma migration only after the dual-read/dual-calculate outputs are reviewed.
4. Backfill current planning rows into bookings/assignments with a reversible migration.
5. Switch command-centre KPIs and attention flags to v2 calculations.
6. Promote v2 publish envelopes to the outbound event table.
