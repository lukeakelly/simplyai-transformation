# ADR-002: Model commercial authority and risk as overlays

## Status

Accepted for Priority 0 implementation.

## Context

Existing allocation statuses include `At Risk`, which mixes delivery/resource state with commercial conditions such as unsigned SOWs, unsigned extensions and missing POs. The target operating model requires these conditions to be commercial-risk overlays rather than resource-allocation statuses.

## Decision

Introduce `CommercialAuthorityV2` and `CommercialRiskOverlayV2`:

- `CommercialAuthorityV2` stores SOW, PO and finance approval state with source evidence.
- `CommercialRiskOverlayV2` derives risk indicators from authority gaps and delivery/booked work.
- Attention signals expose color, status text, reason, evidence and recommended action.

## Consequences

- Resource booking status remains about capacity commitment.
- Commercial risk can be shown on schedules and engagement drilldowns without corrupting capacity calculations.
- Existing `At Risk` allocations must be reconciled into hard bookings plus commercial overlays where evidence supports that interpretation.
