export type AssignmentStatus = "Confirmed" | "Tentative" | "Requested" | "Waiting List" | "At Risk";
export type AssignmentType = "Billable" | "Managed Service" | "Presales" | "Business Development" | "Internal" | "Training" | "Leave" | "Bench";
export type DemandStatus = "Qualified" | "Proposed" | "Committed" | "Waiting List" | "Expired";
export type MigrationSeverity = "Critical" | "Warning" | "Info";

export type ResourcePerson = {
  id: string;
  employeeNo: string;
  name: string;
  role: string;
  level: string;
  pillar: string;
  manager: string;
  location: string;
  employmentType: string;
  dailyCapacityHours: number;
  skills: string[];
  certifications: string[];
  billRate: number;
  costRate: number;
  tags: string[];
};

export type ResourceProject = {
  id: string;
  client: string;
  name: string;
  code: string;
  pillar: string;
  deliveryLead: string;
  health: "Green" | "Amber" | "Red";
};

export type ResourceDemand = {
  id: string;
  client: string;
  opportunity: string;
  hubspotId: string;
  role: string;
  level: string;
  requiredSkills: string[];
  start: string;
  end: string;
  allocationPct: number;
  status: DemandStatus;
  stage: string;
  confidence: number;
  priority: "Critical" | "High" | "Medium";
  location: string;
  pillar: string;
  expiryDate: string;
  rate: number;
  notes: string;
};

export type ResourceAssignment = {
  id: string;
  personId: string | null;
  projectId: string;
  type: AssignmentType;
  status: AssignmentStatus;
  role: string;
  start: string;
  end: string;
  allocationPct: number;
  confidence: number;
  source: string;
  notes: string;
  override?: {
    reason: string;
    approver: string;
    expiryDate: string;
  };
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  record: string;
  summary: string;
  at: string;
};

export type MigrationIssue = {
  id: string;
  severity: MigrationSeverity;
  area: string;
  record: string;
  issue: string;
  proposedResolution: string;
  status: "Open" | "Mapped" | "Accepted";
};

export const TODAY = "2026-07-06";

export const resourcePeople: ResourcePerson[] = [
  {
    id: "p-ava",
    employeeNo: "SIA-001",
    name: "Ava Taylor",
    role: "Principal Consultant",
    level: "Principal",
    pillar: "Data & AI",
    manager: "Maya Chen",
    location: "Sydney",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Data strategy", "Azure", "APA", "Stakeholder leadership"],
    certifications: ["Azure Solutions Architect"],
    billRate: 2200,
    costRate: 1120,
    tags: ["principal", "cross-pillar"],
  },
  {
    id: "p-ben",
    employeeNo: "SIA-002",
    name: "Ben O'Connor",
    role: "Agentic AI Engineer",
    level: "Senior Consultant",
    pillar: "Agentic AI",
    manager: "Noah Singh",
    location: "Melbourne",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Agents", "OpenAI", "Python", "Powerlink"],
    certifications: ["AWS ML Specialty"],
    billRate: 1850,
    costRate: 920,
    tags: ["delivery"],
  },
  {
    id: "p-charlie",
    employeeNo: "SIA-003",
    name: "Charlie Nguyen",
    role: "Cloud Architect",
    level: "Lead Consultant",
    pillar: "Cloud",
    manager: "Maya Chen",
    location: "Brisbane",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Azure", "AWS", "CBA", "Landing zones"],
    certifications: ["Security Clearance Baseline"],
    billRate: 2050,
    costRate: 1030,
    tags: ["ending-soon"],
  },
  {
    id: "p-diya",
    employeeNo: "SIA-004",
    name: "Diya Patel",
    role: "Data Engineer",
    level: "Consultant",
    pillar: "Data Addiction",
    manager: "Priya Raman",
    location: "Sydney",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Databricks", "Snowflake", "Cleanaway", "Python"],
    certifications: ["Databricks Data Engineer"],
    billRate: 1550,
    costRate: 720,
    tags: ["available-mid-month"],
  },
  {
    id: "p-eli",
    employeeNo: "SIA-005",
    name: "Eli Brooks",
    role: "Delivery Lead",
    level: "Principal",
    pillar: "Innovation Hub",
    manager: "Sofia Martin",
    location: "Perth",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Delivery governance", "Presales", "Product", "AGL"],
    certifications: ["PMP"],
    billRate: 2150,
    costRate: 1100,
    tags: ["principal"],
  },
  {
    id: "p-farah",
    employeeNo: "SIA-006",
    name: "Farah Haddad",
    role: "AI Consultant",
    level: "Consultant",
    pillar: "Agentic AI",
    manager: "Noah Singh",
    location: "Sydney",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Agents", "Prompt engineering", "CBA", "Training"],
    certifications: ["Azure AI Engineer"],
    billRate: 1450,
    costRate: 680,
    tags: ["leave-aware"],
  },
  {
    id: "p-george",
    employeeNo: "SIA-007",
    name: "George Williams",
    role: "Managed Services Engineer",
    level: "Senior Consultant",
    pillar: "Cloud",
    manager: "Priya Raman",
    location: "Adelaide",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Managed services", "Azure", "Support", "APA"],
    certifications: ["ITIL"],
    billRate: 1350,
    costRate: 690,
    tags: ["support"],
  },
  {
    id: "p-hana",
    employeeNo: "SIA-008",
    name: "Hana Sato",
    role: "Solution Designer",
    level: "Lead Consultant",
    pillar: "Data & AI",
    manager: "Maya Chen",
    location: "Tokyo",
    employmentType: "Contractor",
    dailyCapacityHours: 7.5,
    skills: ["Solution design", "Data mesh", "Powerlink", "Japanese"],
    certifications: ["TOGAF"],
    billRate: 1900,
    costRate: 980,
    tags: ["offshore", "contractor-end"],
  },
  {
    id: "p-isaac",
    employeeNo: "SIA-009",
    name: "Isaac Mensah",
    role: "Graduate Analyst",
    level: "Graduate",
    pillar: "Data Addiction",
    manager: "Priya Raman",
    location: "Melbourne",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["SQL", "Power BI", "Data quality", "Training"],
    certifications: [],
    billRate: 850,
    costRate: 420,
    tags: ["graduate", "bench"],
  },
  {
    id: "p-juno",
    employeeNo: "SIA-010",
    name: "Juno Kelly",
    role: "People Partner",
    level: "Manager",
    pillar: "Corporate",
    manager: "Sofia Martin",
    location: "Sydney",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Workforce planning", "Employment Hero", "Onboarding"],
    certifications: [],
    billRate: 0,
    costRate: 760,
    tags: ["parental-leave"],
  },
  {
    id: "p-kai",
    employeeNo: "SIA-011",
    name: "Kai Roberts",
    role: "Sales Engineer",
    level: "Senior Consultant",
    pillar: "Innovation Hub",
    manager: "Sofia Martin",
    location: "Sydney",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Presales", "HubSpot", "Demos", "CBA"],
    certifications: [],
    billRate: 1600,
    costRate: 810,
    tags: ["presales"],
  },
  {
    id: "p-lara",
    employeeNo: "SIA-012",
    name: "Lara Evans",
    role: "Data Product Manager",
    level: "Manager",
    pillar: "Data & AI",
    manager: "Maya Chen",
    location: "Brisbane",
    employmentType: "Permanent",
    dailyCapacityHours: 8,
    skills: ["Product", "Data governance", "Stakeholder leadership"],
    certifications: ["Scrum Product Owner"],
    billRate: 1750,
    costRate: 900,
    tags: ["internal-product"],
  },
];

export const resourceProjects: ResourceProject[] = [
  { id: "proj-apa", client: "APA", name: "Data Platform Uplift", code: "APA-DPU", pillar: "Data & AI", deliveryLead: "Ava Taylor", health: "Green" },
  { id: "proj-agl", client: "AGL", name: "Agent Operations", code: "AGL-AOPS", pillar: "Agentic AI", deliveryLead: "Eli Brooks", health: "Amber" },
  { id: "proj-cba", client: "CBA", name: "GenAI Factory", code: "CBA-GEN", pillar: "Agentic AI", deliveryLead: "Charlie Nguyen", health: "Green" },
  { id: "proj-powerlink", client: "Powerlink", name: "Cloud Control Room", code: "PWL-CCR", pillar: "Cloud", deliveryLead: "Ben O'Connor", health: "Amber" },
  { id: "proj-cleanaway", client: "Cleanaway", name: "Forecasting Pilot", code: "CLN-FOR", pillar: "Data Addiction", deliveryLead: "Diya Patel", health: "Green" },
  { id: "proj-ms", client: "APA", name: "Managed Service", code: "APA-MS", pillar: "Cloud", deliveryLead: "George Williams", health: "Green" },
  { id: "proj-presales", client: "Simplyai", name: "Presales Capacity", code: "SIA-PS", pillar: "Innovation Hub", deliveryLead: "Kai Roberts", health: "Green" },
  { id: "proj-product", client: "Simplyai", name: "Resource Command Centre", code: "SIA-RCC", pillar: "Innovation Hub", deliveryLead: "Lara Evans", health: "Green" },
  { id: "proj-training", client: "Simplyai", name: "Certification Sprint", code: "SIA-TRN", pillar: "Corporate", deliveryLead: "Juno Kelly", health: "Green" },
  { id: "proj-leave", client: "Simplyai", name: "Leave / unavailable", code: "LEAVE", pillar: "Corporate", deliveryLead: "People", health: "Green" },
];

export const resourceAssignments: ResourceAssignment[] = [
  { id: "asg-1", personId: "p-ava", projectId: "proj-apa", type: "Billable", status: "Confirmed", role: "Principal Data Strategist", start: "2026-07-06", end: "2026-07-31", allocationPct: 60, confidence: 100, source: "Workbook import", notes: "Split allocation: 60% APA." },
  { id: "asg-2", personId: "p-ava", projectId: "proj-agl", type: "Billable", status: "Confirmed", role: "Advisory Principal", start: "2026-07-06", end: "2026-07-31", allocationPct: 40, confidence: 100, source: "Workbook import", notes: "Split allocation: 40% AGL." },
  { id: "asg-3", personId: "p-farah", projectId: "proj-leave", type: "Leave", status: "Confirmed", role: "Annual leave", start: "2026-07-06", end: "2026-07-17", allocationPct: 50, confidence: 100, source: "HR import", notes: "Leave reduces working capacity." },
  { id: "asg-4", personId: "p-farah", projectId: "proj-cba", type: "Billable", status: "Confirmed", role: "AI Consultant", start: "2026-07-06", end: "2026-07-17", allocationPct: 50, confidence: 100, source: "Workbook import", notes: "50% client work around leave." },
  { id: "asg-5", personId: "p-ben", projectId: "proj-cba", type: "Billable", status: "Tentative", role: "Agent Engineer", start: "2026-07-06", end: "2026-07-24", allocationPct: 100, confidence: 55, source: "Pipeline hold", notes: "Alternative with Powerlink; expires if CBA does not commit." },
  { id: "asg-6", personId: "p-ben", projectId: "proj-powerlink", type: "Billable", status: "Waiting List", role: "Agent Engineer", start: "2026-07-06", end: "2026-07-24", allocationPct: 100, confidence: 35, source: "Workbook ambiguity", notes: "Unresolved alternative: 100% CBA or 100% Powerlink." },
  { id: "asg-7", personId: "p-eli", projectId: "proj-presales", type: "Presales", status: "Confirmed", role: "Presales principal", start: "2026-07-06", end: "2026-07-31", allocationPct: 30, confidence: 100, source: "Workbook import", notes: "Presales capacity." },
  { id: "asg-8", personId: "p-eli", projectId: "proj-product", type: "Internal", status: "Confirmed", role: "Product sponsor", start: "2026-07-06", end: "2026-07-31", allocationPct: 30, confidence: 100, source: "Workbook import", notes: "Internal product investment." },
  { id: "asg-9", personId: "p-eli", projectId: "proj-agl", type: "Billable", status: "Confirmed", role: "Delivery lead", start: "2026-07-06", end: "2026-07-31", allocationPct: 40, confidence: 100, source: "Workbook import", notes: "Billable delivery leadership." },
  { id: "asg-10", personId: "p-diya", projectId: "proj-cleanaway", type: "Billable", status: "Confirmed", role: "Data Engineer", start: "2026-07-20", end: "2026-08-14", allocationPct: 100, confidence: 100, source: "Workbook import", notes: "Becomes available mid-month." },
  { id: "asg-11", personId: "p-juno", projectId: "proj-leave", type: "Leave", status: "Confirmed", role: "Parental leave", start: "2026-07-06", end: "2026-09-25", allocationPct: 100, confidence: 100, source: "HR import", notes: "Parental leave." },
  { id: "asg-12", personId: "p-charlie", projectId: "proj-cba", type: "Billable", status: "Confirmed", role: "Cloud architect", start: "2026-07-06", end: "2026-07-18", allocationPct: 100, confidence: 100, source: "Workbook import", notes: "Ending soon; proposed extension required." },
  { id: "asg-13", personId: "p-charlie", projectId: "proj-powerlink", type: "Billable", status: "At Risk", role: "Architecture escalation", start: "2026-07-13", end: "2026-07-24", allocationPct: 40, confidence: 75, source: "Manual request", notes: "Exceeds capacity without override." },
  { id: "asg-14", personId: "p-george", projectId: "proj-ms", type: "Managed Service", status: "Confirmed", role: "Support lead", start: "2026-07-06", end: "2026-08-28", allocationPct: 70, confidence: 100, source: "Workbook import", notes: "Managed service/support." },
  { id: "asg-15", personId: "p-george", projectId: "proj-training", type: "Training", status: "Confirmed", role: "Certification", start: "2026-07-06", end: "2026-07-10", allocationPct: 30, confidence: 100, source: "People plan", notes: "Training capacity." },
  { id: "asg-16", personId: "p-hana", projectId: "proj-powerlink", type: "Billable", status: "Confirmed", role: "Solution designer", start: "2026-07-06", end: "2026-08-21", allocationPct: 80, confidence: 100, source: "Workbook import", notes: "Offshore contractor; contract end approaching." },
  { id: "asg-17", personId: "p-kai", projectId: "proj-presales", type: "Business Development", status: "Confirmed", role: "Account demos", start: "2026-07-06", end: "2026-07-31", allocationPct: 50, confidence: 100, source: "Sales plan", notes: "Business development and marketing." },
  { id: "asg-18", personId: "p-lara", projectId: "proj-product", type: "Internal", status: "Confirmed", role: "Product manager", start: "2026-07-06", end: "2026-08-14", allocationPct: 80, confidence: 100, source: "Internal initiative", notes: "Non-billable product work." },
];

export const resourceDemands: ResourceDemand[] = [
  { id: "dem-1", client: "Cleanaway", opportunity: "Forecasting scale-up", hubspotId: "hs-984102", role: "Data Engineer", level: "Consultant", requiredSkills: ["Databricks", "Python", "Cleanaway"], start: "2026-07-13", end: "2026-08-28", allocationPct: 60, status: "Qualified", stage: "Qualified", confidence: 70, priority: "High", location: "Sydney", pillar: "Data Addiction", expiryDate: "2026-07-18", rate: 1550, notes: "Unfilled HubSpot opportunity role." },
  { id: "dem-2", client: "Powerlink", opportunity: "Agent control room", hubspotId: "hs-775231", role: "Agentic AI Engineer", level: "Senior Consultant", requiredSkills: ["Agents", "Powerlink", "Python"], start: "2026-07-20", end: "2026-09-11", allocationPct: 100, status: "Proposed", stage: "Proposal", confidence: 55, priority: "Critical", location: "Brisbane", pillar: "Agentic AI", expiryDate: "2026-07-25", rate: 1850, notes: "Pipeline hold should remain tentative until committed." },
  { id: "dem-3", client: "CBA", opportunity: "GenAI operating model", hubspotId: "hs-451219", role: "Principal Consultant", level: "Principal", requiredSkills: ["Stakeholder leadership", "CBA", "Data strategy"], start: "2026-07-27", end: "2026-09-18", allocationPct: 40, status: "Committed", stage: "Closed won", confidence: 95, priority: "High", location: "Melbourne", pillar: "Data & AI", expiryDate: "2026-08-01", rate: 2200, notes: "Requires senior coverage." },
];

export const migrationIssues: MigrationIssue[] = [
  { id: "mig-1", severity: "Critical", area: "Identity", record: "Workbook row 118", issue: "Formatted name was used as a join key and conflicts with another resource.", proposedResolution: "Create stable employee ID and map aliases during import review.", status: "Open" },
  { id: "mig-2", severity: "Warning", area: "Allocation", record: "Ben O'Connor July", issue: "Cell reads '100% CBA or 100% Powerlink' and cannot become a confirmed assignment automatically.", proposedResolution: "Create one tentative hold and one waiting-list conflict for human resolution.", status: "Mapped" },
  { id: "mig-3", severity: "Warning", area: "Capacity", record: "Charlie Nguyen July", issue: "Total planned work reaches 140% on overlapping dates.", proposedResolution: "Surface conflict and require time-limited approved override or re-plan.", status: "Mapped" },
  { id: "mig-4", severity: "Info", area: "Location", record: "Legacy division Data Addiction", issue: "Legacy division label is not mapped to a configured pillar in every workbook row.", proposedResolution: "Accept Data Addiction as a pillar alias and review unmapped rows.", status: "Accepted" },
  { id: "mig-5", severity: "Warning", area: "Finance", record: "Rates area", issue: "Workbook formula/reference errors found in resource-to-revenue connection area.", proposedResolution: "Use project rate cards and person rates; keep imported formula errors in the report.", status: "Open" },
];

export const auditEntries: AuditEntry[] = [
  { id: "aud-1", actor: "COO / Resource Manager", action: "Imported workbook", record: "All Pillars - Revised", summary: "Created 212 people, 2,300+ allocation cells and 17 data-quality exceptions in staging.", at: "2026-07-06 09:02" },
  { id: "aud-2", actor: "Pillar Lead", action: "Created tentative hold", record: "Ben O'Connor / CBA", summary: "Ambiguous CBA or Powerlink allocation split into tentative and waiting-list records.", at: "2026-07-06 10:14" },
  { id: "aud-3", actor: "COO / Resource Manager", action: "Raised approval", record: "Charlie Nguyen", summary: "40% over-allocation requires exception with expiry before it can be confirmed.", at: "2026-07-06 11:30" },
];

export function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = parseDate(start);
  const last = parseDate(end);
  while (cursor <= last) {
    out.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function businessDays(start: string, count: number): string[] {
  const out: string[] = [];
  const cursor = parseDate(start);
  while (out.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) out.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function overlaps(date: string, assignment: ResourceAssignment): boolean {
  return assignment.start <= date && date <= assignment.end;
}

export function assignmentProject(assignment: ResourceAssignment): ResourceProject {
  return resourceProjects.find((project) => project.id === assignment.projectId) ?? resourceProjects[0];
}

export function money(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
  }).format(parseDate(value));
}
