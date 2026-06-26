# ADR-001: Separate resource demand, bookings and named assignments

## Status

Accepted for Priority 0 implementation.

## Context

The current MVP uses allocation status/type fields to represent demand, tentative holds, confirmed scheduling, risk and person-level work. The target operating model requires separate concepts because bench, scenario planning and capacity calculations depend on whether work is demand, a soft booking, a hard booking or a named assignment.

## Decision

Introduce a v2 contract with `ResourceDemandV2`, `BookingV2` and `NamedAssignmentV2`:

- `ResourceDemandV2` represents role/skill/time need before capacity is reserved.
- `BookingV2` reserves or holds capacity and has explicit `bookingStrength = soft | hard`.
- `NamedAssignmentV2` records a named person performing work against a project.

Soft bookings are visible but do not reduce residual bench. Hard bookings reduce bench. Named assignments are delivery execution records, not the source of booking strength.

## Consequences

- Bench can be calculated as residual effective capacity after leave and hard bookings.
- Scenario planning can manipulate bookings without rewriting actual assignments.
- Existing allocation records need a migration split into booking and assignment concepts.
- Current UI models can be supported during transition by deriving them from v2 concepts.
