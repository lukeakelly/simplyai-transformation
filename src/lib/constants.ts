export const STATUSES = [
  "Not Started",
  "In Progress",
  "Drafted",
  "Under Review",
  "Approved",
  "Embedded",
  "At Risk",
  "Blocked",
  "Deferred",
] as const;

export const PRIORITIES = ["Critical Path", "High", "Medium", "Low"] as const;

export const ARTEFACT_TYPES = [
  "Strategy",
  "Register",
  "Template",
  "Dashboard",
  "Policy",
  "Process",
  "Checklist",
  "Framework",
  "JD / Role Charter",
  "Operating Model",
  "Calendar",
  "Playbook",
  "Pack",
  "Matrix",
  "Control",
  "Communication Type",
  "System / Data Asset",
] as const;

export const RECURRENCE = ["One-off", "Recurring"] as const;

export const STATUS_COLORS: Record<string, string> = {
  "Not Started": "#94a3b8",
  "In Progress": "#3b82f6",
  Drafted: "#8b5cf6",
  "Under Review": "#eab308",
  Approved: "#10b981",
  Embedded: "#059669",
  "At Risk": "#f97316",
  Blocked: "#ef4444",
  Deferred: "#64748b",
};

export const PRIORITY_COLORS: Record<string, string> = {
  "Critical Path": "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#94a3b8",
};

// Statuses that count an item as "done" for completion metrics.
export const DONE_STATUSES = new Set(["Approved", "Embedded"]);

export const HORIZON_PALETTE = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#2563eb",
];
