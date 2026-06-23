import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MLVizzProvider, MLVizzProviderOptions } from "./provider";
import { assertValidMLVizzSnapshot } from "./validation";

export class FileMLVizzProvider implements MLVizzProvider {
  readonly providerName = "file" as const;

  constructor(private readonly baseDirectory = path.join(process.cwd(), "fixtures", "mlvizz", "v1")) {}

  async getSnapshot(options: MLVizzProviderOptions = {}) {
    const packId = options.packId ?? "functional-demo";
    const payload = await readFile(path.join(this.baseDirectory, packId, "snapshot.json"), "utf8");
    const snapshot = JSON.parse(payload);
    assertValidMLVizzSnapshot(snapshot);
    return snapshot;
  }
}
