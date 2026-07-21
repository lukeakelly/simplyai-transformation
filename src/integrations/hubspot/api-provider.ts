import type { HubSpotProvider, HubSpotProviderOptions } from "./provider";
import type {
  HubSpotCompany,
  HubSpotContact,
  HubSpotDeal,
  HubSpotEngagement,
  HubSpotOwner,
  HubSpotSnapshot,
  HubSpotTask,
} from "./types";

/**
 * Production-facing scaffold. Talks to the HubSpot CRM v3 REST API directly
 * using a private app access token — this is a different credential to the
 * connector used inside a Claude session, and must be configured as a server
 * env var (HUBSPOT_PRIVATE_APP_TOKEN) before this provider can be used.
 *
 * Not yet exercised against a live HubSpot portal. Property names below are
 * documented in docs/hubspot-sales-integration.md and should be re-verified
 * with search_properties/get_properties against the target portal, since
 * custom properties (forecast category, presales fields, etc.) vary by portal.
 */
export type ApiHubSpotProviderConfig = {
  baseUrl?: string;
  token: string;
  fetchImplementation?: typeof fetch;
};

const DEAL_PROPERTIES = [
  "dealname",
  "amount",
  "deal_currency_code",
  "pipeline",
  "dealstage",
  "hubspot_owner_id",
  "hs_deal_stage_probability",
  "hs_manual_forecast_category",
  "hs_forecast_amount",
  "closedate",
  "createdate",
  "hs_v2_date_entered_current_stage",
  "notes_last_updated",
  "notes_last_contacted",
  "notes_next_activity_date",
  "hs_next_step",
];

type HubSpotApiObject = {
  id: string;
  properties: Record<string, string | null>;
};

export class ApiHubSpotProvider implements HubSpotProvider {
  readonly providerName = "api" as const;
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly config: ApiHubSpotProviderConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.hubapi.com";
    this.fetchImplementation = config.fetchImplementation ?? fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImplementation(new URL(path, this.baseUrl), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.token}`,
        ...init?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`HubSpot API request to ${path} failed with ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  }

  private async searchDeals(ownerId: string): Promise<HubSpotApiObject[]> {
    const results: HubSpotApiObject[] = [];
    let after: string | undefined;
    do {
      const page = await this.request<{ results: HubSpotApiObject[]; paging?: { next?: { after: string } } }>(
        "/crm/v3/objects/deals/search",
        {
          method: "POST",
          body: JSON.stringify({
            filterGroups: [
              { filters: [{ propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId }] },
            ],
            properties: DEAL_PROPERTIES,
            limit: 100,
            after,
          }),
        },
      );
      results.push(...page.results);
      after = page.paging?.next?.after;
    } while (after);
    return results;
  }

  private async getOwner(ownerId: string): Promise<HubSpotOwner> {
    const owner = await this.request<{ id: string; email: string; firstName?: string; lastName?: string; archived: boolean }>(
      `/crm/v3/owners/${ownerId}`,
    );
    return {
      ownerId: owner.id,
      name: [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.email,
      email: owner.email,
      isActive: !owner.archived,
    };
  }

  private mapDeal(raw: HubSpotApiObject): HubSpotDeal {
    const p = raw.properties;
    const stageId = p.dealstage ?? "";
    const isClosedWon = stageId.toLowerCase().includes("closedwon") || stageId === "86637492";
    const isClosedLost = stageId.toLowerCase().includes("closedlost") || stageId === "86655538";
    const amount = p.amount ? Number(p.amount) : null;
    const probability = p.hs_deal_stage_probability ? Number(p.hs_deal_stage_probability) : null;
    return {
      id: raw.id,
      name: p.dealname ?? "(untitled deal)",
      ownerId: p.hubspot_owner_id ?? null,
      companyId: null,
      companyName: null,
      primaryContactId: null,
      primaryContactName: null,
      pipeline: p.pipeline ?? "",
      // Stage/pipeline labels require a lookup against /crm/v3/pipelines/deals —
      // left as the raw internal ID here; the page.tsx data loader is
      // responsible for resolving labels before rendering.
      pipelineLabel: p.pipeline ?? "",
      stage: stageId,
      stageLabel: stageId,
      isClosedWon,
      isClosedLost,
      amount,
      currency: p.deal_currency_code ?? "AUD",
      probability: isClosedWon || isClosedLost ? null : probability,
      forecastCategory: (p.hs_manual_forecast_category as HubSpotDeal["forecastCategory"]) ?? null,
      forecastAmount: p.hs_forecast_amount ? Number(p.hs_forecast_amount) : null,
      closeDate: p.closedate ? p.closedate.slice(0, 10) : null,
      createdAt: p.createdate ?? new Date(0).toISOString(),
      stageEnteredAt: p.hs_v2_date_entered_current_stage ?? null,
      lastActivityAt: p.notes_last_updated ?? null,
      lastContactedAt: p.notes_last_contacted ?? null,
      nextActivityAt: p.notes_next_activity_date ?? null,
      nextStep: p.hs_next_step ?? null,
      strategicallyImportant: false,
      dealUrl: `${this.baseUrl.replace("api.hubapi.com", "app.hubspot.com")}/contacts/deal/${raw.id}`,
    };
  }

  async getSnapshot(options: HubSpotProviderOptions): Promise<HubSpotSnapshot> {
    const [owner, dealResults] = await Promise.all([
      this.getOwner(options.ownerId),
      this.searchDeals(options.ownerId),
    ]);
    const deals = dealResults.map((raw) => this.mapDeal(raw));

    // Company/contact/task/engagement association lookups are not yet
    // implemented in this scaffold — see the roadmap in
    // docs/hubspot-sales-integration.md for the follow-up work required
    // (batch association reads + object fetch for each deal).
    const companies: HubSpotCompany[] = [];
    const contacts: HubSpotContact[] = [];
    const tasks: HubSpotTask[] = [];
    const engagements: HubSpotEngagement[] = [];

    return {
      dataSource: "live",
      fetchedAt: new Date().toISOString(),
      owner,
      deals,
      contacts,
      companies,
      tasks,
      engagements,
    };
  }
}
