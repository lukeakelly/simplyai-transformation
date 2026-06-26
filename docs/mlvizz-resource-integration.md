# MLVizz resource integration

## Contract-first boundary

The resource app consumes MLVizz through `MLVizzProvider`, not through source-system payloads or UI-level fixtures. Current implementations:

- `MockMLVizzProvider`: default application/demo provider backed by versioned synthetic JSON.
- `FileMLVizzProvider`: loads the same canonical `snapshot.json` contract from disk for supplied extracts.
- `ApiMLVizzProvider`: production-facing scaffold that fetches canonical snapshots from a configured MLVizz endpoint and validates the contract.

All providers return `MLVizzSnapshot` (`mlvizz-resource-v1`). Switching providers should be configuration/integration work; UI and scheduling logic should continue using canonical domain objects.

## Source-of-truth ownership

| Domain | Origin through MLVizz | App behaviour |
| --- | --- | --- |
| People, employment status, managers, location, FTE, leave | Employment Hero | Read-only enterprise data |
| Opportunities and client/company master | HubSpot | Read-only demand/master data |
| Submitted and approved timesheet actuals | Astute | Read-only actual effort |
| Invoices, payments and financial actuals | Xero | Read-only financial actuals |
| Planned allocations, tentative holds, approvals, scenarios, comments and audit | Resource app | Read/write local operational data; outbound publish scaffold |
| Skills/certifications | Configurable | App-owned initially until MLVizz/source ownership is confirmed |

## Identity mappings

Canonical IDs are mandatory for people, clients, opportunities and projects. Names and email addresses are display/search attributes only, never sole join keys. `identityMappings` carries source identifiers for Employment Hero, Astute, HubSpot, Xero, MLVizz and app-owned records.

## Synthetic packs

Synthetic fixtures are under `fixtures/mlvizz/v1`:

- `nominal-small`: smoke-test and rapid development dataset.
- `functional-demo`: leadership/demo dataset used by the current UI.
- `edge-cases`: stale refresh, failed records, duplicate quarantine, missing mapping, inactive/deleted and historical correction scenarios.

Regenerate fixtures with:

```bash
npm run mlvizz:generate-fixtures
```

Validate provider contract compatibility with:

```bash
npm run test:mlvizz
```

## Local operational database

The Prisma schema includes resource planning tables for immediate app-owned changes:

- `ResourcePlannedAllocation`
- `ResourceSyncRun`
- `ResourceFailedRecord`
- `ResourceOutboundEvent`

Client scheduling actions call a server action that upserts allocation changes and records outbound events. MLVizz refresh failures must not erase these app-owned planning records.

## Outbound interface

`MLVizzOutboundPublisher` supports future write API, ingestion endpoint, pull API, event feed, scheduled extract or secure data-lake delivery. The first scaffold implementation writes JSON extracts locally for contract/testing purposes.

## Open integration decisions

- Authentication method and credential scope.
- MLVizz access style: REST, GraphQL, SQL, file or other.
- Incremental retrieval, pagination and deletion semantics.
- Whether MLVizz accepts app-owned data and by which mechanism.
- Non-production endpoint availability.
- Schema-change notification and rate limits.
- Data residency/retention settings.
- Skills/certifications ownership.
- Canonical project identity across HubSpot, Astute and Xero.
- Xero fields approved for operational reporting.
