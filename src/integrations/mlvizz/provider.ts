import type { MLVizzSnapshot } from "./contracts";

export type MLVizzProviderName = "mock" | "file" | "api";

export type MLVizzProviderOptions = {
  packId?: "nominal-small" | "functional-demo" | "edge-cases";
  correlationId?: string;
};

export interface MLVizzProvider {
  readonly providerName: MLVizzProviderName;
  getSnapshot(options?: MLVizzProviderOptions): Promise<MLVizzSnapshot>;
}
