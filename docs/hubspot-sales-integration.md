# Sales Command Centre — HubSpot integration

## What this is

`/sales-command-centre` is a personalised daily workspace for a Simplyai
salesperson: today's priorities, target attainment, top deals, exceptions,
CRM data-quality gaps, pipeline overview and activity — all scoped to the
logged-in user's own HubSpot deals. It mirrors the provider/operational-data
architecture already used by the Resource Command Centre
(`docs/mlvizz-resource-integration.md`): a swappable `HubSpotProvider`
supplies read-only CRM data, and a small set of Prisma tables hold
app-owned data (manual targets, and local-only actions on priority items).

The prototype ships with `MockHubSpotProvider` (clearly-labelled
demonstration data — see "Demo data" below) and a scaffolded
`ApiHubSpotProvider` for a real integration. There is no HubSpot private-app
token configured in this environment, so the live provider path is not yet
exercised end-to-end.

## Connector object/field mapping

Property names below were confirmed against Simplyai's own HubSpot portal
(`search_properties`/`get_properties`, portal ID 20490609) during this
build, except where marked "not yet confirmed."

| App concept | HubSpot object | Property | Notes |
| --- | --- | --- | --- |
| Deal name | Deal | `dealname` | |
| Owner | Deal | `hubspot_owner_id` | Must match the logged-in user's linked owner ID — see "User ↔ owner linkage" |
| Amount | Deal | `amount` | Whole-currency; `deal_currency_code` for currency |
| Pipeline | Deal | `pipeline` | This portal has one pipeline: "Simplyai Pipeline - All Deals" (id `40955303`) |
| Stage | Deal | `dealstage` | Stage IDs are pipeline-specific; label lookup needs `GET /crm/v3/pipelines/deals` |
| Stage probability | Deal | `hs_deal_stage_probability` | |
| Forecast category | Deal | `hs_manual_forecast_category` | |
| Forecast amount | Deal | `hs_forecast_amount` | |
| Close date | Deal | `closedate` | |
| Created date | Deal | `createdate` | |
| Date entered current stage | Deal | `hs_v2_date_entered_current_stage` | Used for "days in stage" |
| Last activity | Deal | `notes_last_updated` | |
| Last contacted | Deal | `notes_last_contacted` | |
| Next activity date | Deal | `notes_next_activity_date` | |
| Next step | Deal | `hs_next_step` | This portal also has custom `presales_recommended_next_step` / `presales_delivery_estimate` fields worth surfacing once presales hand-off matters to the dashboard |
| Primary contact / company | Deal → Contact/Company associations | — | Not yet implemented in `ApiHubSpotProvider` — needs a batch associations read per deal |
| Decision-maker | Contact | *not yet confirmed* | No reliable native HubSpot signal found; likely needs a custom property or lifecycle-stage convention agreed with Sales |
| Tasks | Engagement (TASK) | `hs_task_subject`, `hs_task_due_date`, `hs_task_status` | Not yet confirmed against this portal |
| Calls/emails/meetings/notes | Engagements | — | Not yet confirmed against this portal |
| HubSpot targets/Goals | Goals API | — | Not used yet — manual entry is the interim source (see below) |

Amount/currency, forecast, and activity-date properties above were verified
directly. Task/engagement property names are HubSpot's documented defaults
and should be re-confirmed with `search_properties` before the API provider
is completed, since custom automation in this portal could have changed them.

## User ↔ HubSpot owner linkage

`User.hubspotOwnerId` (nullable) is the join key. It is **not** populated
automatically — an admin needs to set it per user (e.g. via a future
`/users` edit action) once each salesperson's HubSpot owner ID is known.
Until it's set, the dashboard falls back to a placeholder owner and shows a
"No HubSpot owner linked" warning in the header rather than guessing or
showing another owner's data.

## Personalisation & permissions

- Every query is scoped by `hubspot_owner_id = <the logged-in user's linked owner>`.
- The app never queries across all owners. `ApiHubSpotProvider.getSnapshot`
  requires an `ownerId` and searches deals with that filter only.
- A live connector should be a **private app with read-only CRM scopes**
  for the prototype phase (contacts, companies, deals, engagements, owners).
  Write scopes should only be added once a specific, confirmed write-back
  action is being built and explicitly confirmed per action by the user —
  this build performs no HubSpot writes.
- "Ask Claude about my pipeline" is a UI shell only in this build (suggested
  prompts, no live call) — wiring it up requires an Anthropic API key and
  should keep the same "grounded in your own authorised data, never
  fabricate missing values" constraint the original brief calls for.

## Demo data

`MockHubSpotProvider` returns 12 open deals, 3 closed-won and 2 closed-lost,
deliberately mixing healthy/at-risk/stale deals, a missing amount, missing
contacts, an overdue close date, and a deal stuck in-stage — enough to
exercise every section and alert level. **Every company, contact and deal
name in the demo set is fictional.** It does not reflect any real Simplyai
client, prospect or deal. Stage labels for "Closed Won"/"Closed Lost" match
the real portal; intermediate stage labels (Discovery Call, Qualified,
Proposal Sent, Negotiation, Verbal Commitment) are a reasonable placeholder
since this portal currently has no open deals in the pipeline to sample —
confirm the real intermediate stage names before go-live.

The "Demo data" switch in the header always wins over a configured live
token, so it stays useful for screenshots/training after go-live.

## Assumptions made in this build

1. **Manual targets are per-user, per-period** (month/quarter/financial
   year/calendar year), stored in `SalesTarget`, with no default value —
   the salesperson must enter one. Custom date ranges don't carry a target.
2. **Target status thresholds** (Ahead ≥105% of forecast-to-target,
   On Track ≥90%, At Risk ≥60%, else Off Track) are a starting heuristic,
   not a number from HubSpot or Simplyai policy — confirm with sales
   leadership before this drives any real conversation.
3. **"Stale" = 7+ days without logged activity; "too long in stage" =
   45+ days.** Both are placeholders pending input from the sales team on
   what's actually abnormal for Simplyai's typical deal cycle.
4. **Decision-maker status** is treated as unknown for every contact — there
   is no reliable HubSpot-native signal, so the dashboard never asserts a
   contact is or isn't a decision-maker.
5. **Stage conversion rates and "deals progressed" are not shown** — HubSpot
   doesn't retain enough native history in a single snapshot to calculate
   these reliably. This needs either HubSpot's deal-stage history API or a
   retained history of our own snapshots.
6. **"What matters today" and per-deal recommendations are rule-based**
   text generated from the same scoring/alert logic as the rest of the
   page — not a live model call. They're labelled as such in the UI.
7. HubSpot's connector permissions inside a Claude session (used to explore
   this schema) are a **different credential** to what a deployed Next.js
   server needs (`HUBSPOT_PRIVATE_APP_TOKEN`, a private-app access token).
   No such token exists in this environment yet.

## Open questions for Simplyai stakeholders

1. Which HubSpot owner ID(s) map to which Simplyai app user(s), and who
   maintains that mapping as the team changes?
2. Should sales targets eventually come from HubSpot Goals, a separate
   planning tool, or stay manually entered in this app?
3. What's the agreed definition of "stale" and "too long in stage" for
   Simplyai's actual deal cycle (used throughout the alerting)?
4. Is there (or should there be) a custom HubSpot property capturing
   decision-maker status, so the dashboard can show it reliably rather than
   "unknown"?
5. Which write-back actions (if any) should eventually be supported —
   e.g. updating next step, logging a completed task — and who signs off
   on enabling write scopes on the private app?

## Implementation roadmap

1. **Prototype (this change).** Interactive dashboard, demo data, manual
   targets, prioritisation/alert logic, no HubSpot writes.
2. **Read-only HubSpot integration.** Provision a private app (read-only
   CRM scopes), set `HUBSPOT_PRIVATE_APP_TOKEN`, complete
   `ApiHubSpotProvider` (stage/pipeline label lookup, contact/company
   associations, tasks, engagements), link real owner IDs to users.
3. **User acceptance testing.** Run alongside demo data for a small group
   of salespeople; validate field mapping, alert thresholds and target
   maths against real pipelines; capture feedback on the priority ranking.
4. **Controlled write-back.** Add specific, explicitly-confirmed actions
   only (e.g. "mark task complete in HubSpot," "update next step") behind
   a confirmation step, with an audit trail in `SalesActivityAction`/a new
   outbound-event table mirroring `ResourceOutboundEvent`.
5. **Broader sales-team rollout.** Roll out owner-ID linkage and the
   dashboard to the full sales team, with an admin UI for managing the
   User ↔ owner mapping instead of direct database edits.
