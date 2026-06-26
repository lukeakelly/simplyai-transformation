import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MLVizzPlannedAllocation } from "./contracts";

export type MLVizzOutboundRecord =
  | { type: "planned-allocation"; record: MLVizzPlannedAllocation }
  | { type: "resource-request"; recordId: string; payload: Record<string, unknown> }
  | { type: "approval"; recordId: string; payload: Record<string, unknown> };

export type MLVizzOutboundPublishResult = {
  published: number;
  destination: string;
};

export interface MLVizzOutboundPublisher {
  publish(records: MLVizzOutboundRecord[], correlationId: string): Promise<MLVizzOutboundPublishResult>;
}

export class LocalFileOutboundPublisher implements MLVizzOutboundPublisher {
  constructor(private readonly outputDirectory = path.join(process.cwd(), "artifacts", "mlvizz-outbound")) {}

  async publish(records: MLVizzOutboundRecord[], correlationId: string): Promise<MLVizzOutboundPublishResult> {
    await mkdir(this.outputDirectory, { recursive: true });
    const destination = path.join(this.outputDirectory, `${correlationId}.json`);
    await writeFile(destination, `${JSON.stringify({ correlationId, records }, null, 2)}\n`);
    return { published: records.length, destination };
  }
}
