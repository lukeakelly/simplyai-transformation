# ADR-003: Use MLVizz as the governed integration boundary

## Status

Accepted for Priority 0 implementation.

## Context

The resource app needs Employment Hero identity/leave, HubSpot demand and opportunity data, Astute timesheets and Xero finance data. The target operating model forbids unmanaged point-to-point integrations from the resource app to those systems.

## Decision

Keep the resource app behind canonical MLVizz contracts:

- Consume governed enterprise reference data through MLVizz provider contracts.
- Publish app-owned planning data back to MLVizz using versioned `ResourcePlanningSourceDataEnvelope` events.
- Keep historical timesheet archives separate from live resourcing transactions.

## Consequences

- Switching from synthetic to live MLVizz remains configuration/integration work rather than a UI rewrite.
- MLVizz owns cross-system harmonisation and lineage.
- Resource app owns bookings, named assignments, scenarios, comments and exception actions.
- Publish envelopes need idempotency and reconciliation metadata.
