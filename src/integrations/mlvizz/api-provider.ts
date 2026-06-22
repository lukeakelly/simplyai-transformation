import type { MLVizzSnapshot } from "./contracts";
import type { MLVizzProvider, MLVizzProviderOptions } from "./provider";
import { assertValidMLVizzSnapshot } from "./validation";

export type ApiMLVizzProviderConfig = {
  baseUrl: string;
  token?: string;
  fetchSnapshotPath?: (packId: string) => string;
  fetchImplementation?: typeof fetch;
};

export class ApiMLVizzProvider implements MLVizzProvider {
  readonly providerName = "api" as const;
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly config: ApiMLVizzProviderConfig) {
    this.fetchImplementation = config.fetchImplementation ?? fetch;
  }

  async getSnapshot(options: MLVizzProviderOptions = {}): Promise<MLVizzSnapshot> {
    const packId = options.packId ?? "functional-demo";
    const path = this.config.fetchSnapshotPath?.(packId) ?? `/resource/v1/snapshots/${packId}`;
    const response = await this.fetchImplementation(new URL(path, this.config.baseUrl), {
      headers: {
        Accept: "application/json",
        ...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {}),
        ...(options.correlationId ? { "X-Correlation-Id": options.correlationId } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`MLVizz API request failed with ${response.status} ${response.statusText}`);
    }
    const snapshot = await response.json();
    assertValidMLVizzSnapshot(snapshot);
    return snapshot;
  }
}
