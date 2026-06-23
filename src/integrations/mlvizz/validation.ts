import { MLVIZZ_RESOURCE_SCHEMA_VERSION, type MLVizzSnapshot } from "./contracts";

export type MLVizzContractValidationIssue = {
  path: string;
  message: string;
};

export type MLVizzContractValidationResult = {
  valid: boolean;
  issues: MLVizzContractValidationIssue[];
};

type SnapshotRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SnapshotRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isArray(value: unknown) {
  return Array.isArray(value);
}

function requireString(record: SnapshotRecord, key: string, path: string, issues: MLVizzContractValidationIssue[]) {
  if (!isString(record[key])) issues.push({ path: `${path}.${key}`, message: "Expected a non-empty string." });
}

function requireNumber(record: SnapshotRecord, key: string, path: string, issues: MLVizzContractValidationIssue[]) {
  if (!isNumber(record[key])) issues.push({ path: `${path}.${key}`, message: "Expected a number." });
}

function requireArray(record: SnapshotRecord, key: string, path: string, issues: MLVizzContractValidationIssue[]) {
  if (!isArray(record[key])) issues.push({ path: `${path}.${key}`, message: "Expected an array." });
}

function requireLineage(record: SnapshotRecord, path: string, issues: MLVizzContractValidationIssue[]) {
  if (!isRecord(record.lineage)) {
    issues.push({ path: `${path}.lineage`, message: "Expected source lineage." });
    return;
  }
  requireString(record.lineage, "sourceSystem", `${path}.lineage`, issues);
  requireString(record.lineage, "sourceRecordId", `${path}.lineage`, issues);
  requireString(record.lineage, "sourceUpdatedAt", `${path}.lineage`, issues);
  requireString(record.lineage, "mlvizzPublishedAt", `${path}.lineage`, issues);
  if (typeof record.lineage.deleted !== "boolean") {
    issues.push({ path: `${path}.lineage.deleted`, message: "Expected a deleted boolean." });
  }
}

function requireSchemaVersion(record: SnapshotRecord, path: string, issues: MLVizzContractValidationIssue[]) {
  if (record.schemaVersion !== MLVIZZ_RESOURCE_SCHEMA_VERSION) {
    issues.push({ path: `${path}.schemaVersion`, message: `Expected ${MLVIZZ_RESOURCE_SCHEMA_VERSION}.` });
  }
}

function validateCollection(
  snapshot: SnapshotRecord,
  key: keyof MLVizzSnapshot,
  idKey: string,
  requiredStringKeys: string[],
  requiredNumberKeys: string[],
  requiredArrayKeys: string[],
  issues: MLVizzContractValidationIssue[],
) {
  const collection = snapshot[key];
  if (!Array.isArray(collection)) {
    issues.push({ path: String(key), message: "Expected an array." });
    return;
  }
  const ids = new Set<string>();
  collection.forEach((item, index) => {
    const path = `${String(key)}[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: "Expected an object." });
      return;
    }
    requireString(item, idKey, path, issues);
    const id = item[idKey];
    if (typeof id === "string") {
      if (ids.has(id)) issues.push({ path: `${path}.${idKey}`, message: "Duplicate canonical ID." });
      ids.add(id);
    }
    requiredStringKeys.forEach((requiredKey) => requireString(item, requiredKey, path, issues));
    requiredNumberKeys.forEach((requiredKey) => requireNumber(item, requiredKey, path, issues));
    requiredArrayKeys.forEach((requiredKey) => requireArray(item, requiredKey, path, issues));
    requireSchemaVersion(item, path, issues);
    requireLineage(item, path, issues);
  });
}

export function validateMLVizzSnapshot(snapshot: unknown): MLVizzContractValidationResult {
  const issues: MLVizzContractValidationIssue[] = [];
  if (!isRecord(snapshot)) {
    return { valid: false, issues: [{ path: "snapshot", message: "Expected a snapshot object." }] };
  }
  if (!isRecord(snapshot.metadata)) {
    issues.push({ path: "metadata", message: "Expected metadata." });
  } else {
    if (snapshot.metadata.schemaVersion !== MLVIZZ_RESOURCE_SCHEMA_VERSION) {
      issues.push({ path: "metadata.schemaVersion", message: `Expected ${MLVIZZ_RESOURCE_SCHEMA_VERSION}.` });
    }
    ["packId", "generatedAt", "businessEffectiveDate", "mlvizzPublishedAt", "applicationIngestedAt"].forEach((key) =>
      requireString(snapshot.metadata as SnapshotRecord, key, "metadata", issues),
    );
  }

  validateCollection(snapshot, "people", "canonicalPersonId", ["mlvizzPersonId", "displayName", "employmentHeroEmployeeId", "role", "grade"], ["fte", "standardHoursPerDay"], ["skills", "workPattern"], issues);
  validateCollection(snapshot, "leaveEvents", "canonicalLeaveId", ["canonicalPersonId", "employmentHeroLeaveId", "leaveType"], ["hours"], [], issues);
  validateCollection(snapshot, "clients", "canonicalClientId", ["mlvizzClientId", "hubspotCompanyId", "clientName"], [], [], issues);
  validateCollection(snapshot, "opportunities", "canonicalOpportunityId", ["mlvizzOpportunityId", "hubspotDealId", "canonicalClientId", "opportunityName"], ["probabilityPct", "allocationPct"], ["requiredSkills"], issues);
  validateCollection(snapshot, "projects", "canonicalProjectId", ["mlvizzProjectId", "canonicalClientId", "projectCode", "projectName"], [], [], issues);
  validateCollection(snapshot, "resourceRequests", "canonicalRequestId", ["canonicalOpportunityId", "requestedRole"], ["allocationPct"], ["requiredSkills"], issues);
  validateCollection(snapshot, "plannedAllocations", "canonicalAllocationId", ["canonicalProjectId", "allocationType", "status", "role"], ["allocationPct", "confidencePct"], [], issues);
  validateCollection(snapshot, "timesheetActuals", "canonicalTimesheetEntryId", ["astuteTimesheetId", "canonicalPersonId", "canonicalProjectId", "workDate", "approvalStatus"], ["submittedHours", "approvedHours", "billableHours", "nonBillableHours"], [], issues);
  validateCollection(snapshot, "financialActuals", "canonicalFinancialTransactionId", ["xeroTransactionId", "canonicalClientId", "invoiceNumber", "status"], ["netAmount", "taxAmount", "grossAmount", "paidAmount"], [], issues);

  ["refreshRuns", "identityMappings", "failedRecords", "reconciliation"].forEach((key) => {
    if (!Array.isArray(snapshot[key])) issues.push({ path: key, message: "Expected an array." });
  });

  return { valid: issues.length === 0, issues };
}

export function assertValidMLVizzSnapshot(snapshot: unknown): asserts snapshot is MLVizzSnapshot {
  const result = validateMLVizzSnapshot(snapshot);
  if (!result.valid) {
    const message = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    throw new Error(`Invalid MLVizz snapshot:\n${message}`);
  }
}
