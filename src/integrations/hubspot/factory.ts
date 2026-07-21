import type { HubSpotProvider } from "./provider";
import { MockHubSpotProvider } from "./mock-provider";
import { ApiHubSpotProvider } from "./api-provider";

/**
 * Chooses a provider for a request. `forceDemo` lets the UI's "Demo data"
 * switch override a configured live token — useful for training/screenshots
 * even once a real HubSpot integration is live.
 */
export function resolveHubSpotProvider(forceDemo: boolean): HubSpotProvider {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!forceDemo && token) {
    return new ApiHubSpotProvider({ token });
  }
  return new MockHubSpotProvider();
}
