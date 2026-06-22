import edgeCasesSnapshot from "../../../fixtures/mlvizz/v1/edge-cases/snapshot.json";
import functionalDemoSnapshot from "../../../fixtures/mlvizz/v1/functional-demo/snapshot.json";
import nominalSmallSnapshot from "../../../fixtures/mlvizz/v1/nominal-small/snapshot.json";
import type { MLVizzSnapshot } from "./contracts";
import type { MLVizzProvider, MLVizzProviderOptions } from "./provider";
import { assertValidMLVizzSnapshot } from "./validation";

const snapshots = {
  "nominal-small": nominalSmallSnapshot,
  "functional-demo": functionalDemoSnapshot,
  "edge-cases": edgeCasesSnapshot,
} as const;

export class MockMLVizzProvider implements MLVizzProvider {
  readonly providerName = "mock" as const;

  getSnapshotSync(options: MLVizzProviderOptions = {}): MLVizzSnapshot {
    const packId = options.packId ?? "functional-demo";
    const snapshot = snapshots[packId];
    assertValidMLVizzSnapshot(snapshot);
    return snapshot;
  }

  async getSnapshot(options: MLVizzProviderOptions = {}) {
    return this.getSnapshotSync(options);
  }
}
