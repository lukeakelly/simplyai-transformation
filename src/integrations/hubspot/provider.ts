import type { HubSpotSnapshot } from "./types";

export type HubSpotProviderName = "mock" | "api";

export type HubSpotProviderOptions = {
  /** HubSpot owner ID to scope the snapshot to. Required — the provider must never return another owner's records. */
  ownerId: string;
  correlationId?: string;
};

export interface HubSpotProvider {
  readonly providerName: HubSpotProviderName;
  getSnapshot(options: HubSpotProviderOptions): Promise<HubSpotSnapshot>;
}
