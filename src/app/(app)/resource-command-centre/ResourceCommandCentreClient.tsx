"use client";

import { useMemo, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileSpreadsheet,
  Filter,
  Lock,
  MessageSquare,
  PanelRightOpen,
  Search,
  ShieldCheck,
  Sparkles,
  SplitSquareHorizontal,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import {
  TODAY,
  addDays,
  assignmentProject,
  auditEntries,
  businessDays,
  financialActuals,
  formatDate,
  identityMappings,
  migrationIssues,
  mlvizzFreshness,
  mlvizzSnapshot,
  money,
  overlaps,
  resourceAllocationHistory,
  reconciliationSummaries,
  resourceAssignments,
  resourceDemands,
  resourcePeople,
  resourceProjects,
  timesheetActuals,
  type AssignmentStatus,
  type AssignmentType,
  type AuditEntry,
  type ResourceAllocationHistoryEntry,
  type ResourceAssignment,
  type ResourceDemand,
  type ResourcePerson,
} from "@/lib/resource-command-data";
import { buildResourceDashboardKpis, formatFteDays, type ResourceDashboardKpis } from "@/lib/resource-command-kpis";
import { saveResourcePlanningEvent } from "./actions";

type Tab = "centre" | "schedule" | "demand" | "people" | "bench" | "migration" | "approvals";
type DragPayload = { kind: "assignment"; id: string } | { kind: "demand"; id: string };
type ConflictDraft = {
  demand: ResourceDemand;
  person: ResourcePerson;
  date: string;
  availablePct: number;
  bookedPct: number;
  resultingPct: number;
};

type MatchResult = {
  person: ResourcePerson;
  score: number;
  skillFit: number;
  availabilityFit: number;
  explanation: string[];
};

type NewMemberDraft = {
  name: string;
  role: string;
  level: string;
  pillar: string;
  manager: string;
  location: string;
  employmentType: string;
  dailyCapacityHours: string;
  skills: string;
  billRate: string;
  costRate: string;
};

const defaultNewMemberDraft: NewMemberDraft = {
  name: "",
  role: "Data Engineer",
  level: "Consultant",
  pillar: "Data & AI",
  manager: "Maya Chen",
  location: "Sydney",
  employmentType: "Permanent",
  dailyCapacityHours: "8",
  skills: "Python, Databricks",
  billRate: "1500",
  costRate: "700",
};

const tabs: { id: Tab; label: string }[] = [
  { id: "centre", label: "Command Centre" },
  { id: "schedule", label: "Schedule" },
  { id: "demand", label: "Demand & Pipeline" },
  { id: "people", label: "People & Skills" },
  { id: "bench", label: "Bench" },
  { id: "migration", label: "MLVizz Sync" },
  { id: "approvals", label: "Approvals & Audit" },
];

const typeClasses: Record<AssignmentType, string> = {
  Billable: "bg-blue-900 text-white border-blue-950",
  "Managed Service": "bg-teal-700 text-white border-teal-800",
  Presales: "bg-purple-700 text-white border-purple-800",
  "Business Development": "bg-violet-700 text-white border-violet-800",
  Internal: "bg-cyan-600 text-white border-cyan-700",
  Training: "bg-sky-200 text-sky-950 border-sky-300",
  Leave: "bg-slate-300 text-slate-800 border-slate-400",
  Bench: "bg-amber-100 text-amber-900 border-amber-300",
};

const statusClasses: Record<AssignmentStatus, string> = {
  Confirmed: "border-solid",
  Tentative: "border-dashed bg-opacity-80",
  Requested: "border-dashed",
  "Waiting List": "border-red-500 bg-[repeating-linear-gradient(45deg,rgba(239,68,68,.16),rgba(239,68,68,.16)_6px,transparent_6px,transparent_12px)]",
  "At Risk": "border-red-500 ring-2 ring-red-200",
};

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(value));
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  }).format(new Date(value));
}

function assignmentDurationDays(assignment: ResourceAssignment) {
  const start = Date.parse(`${assignment.start}T00:00:00.000Z`);
  const end = Date.parse(`${assignment.end}T00:00:00.000Z`);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function assignmentSnapshot(assignment: ResourceAssignment) {
  return {
    id: assignment.id,
    personId: assignment.personId,
    projectId: assignment.projectId,
    type: assignment.type,
    status: assignment.status,
    role: assignment.role,
    start: assignment.start,
    end: assignment.end,
    allocationPct: assignment.allocationPct,
    confidence: assignment.confidence,
    source: assignment.source,
    notes: assignment.notes,
    override: assignment.override ?? null,
  };
}

function personLabel(people: ResourcePerson[], personId: string | null) {
  if (!personId) return "Unfilled";
  return people.find((person) => person.id === personId)?.name ?? personId;
}

function describeAssignmentHistory(people: ResourcePerson[], before: ResourceAssignment | null, after: ResourceAssignment) {
  if (!before) {
    return `${personLabel(people, after.personId)} assigned to ${after.role} at ${pct(after.allocationPct)} from ${formatDate(after.start)} to ${formatDate(after.end)}.`;
  }
  return `${personLabel(people, before.personId)} ${formatDate(before.start)}-${formatDate(before.end)} ${pct(before.allocationPct)} → ${personLabel(people, after.personId)} ${formatDate(after.start)}-${formatDate(after.end)} ${pct(after.allocationPct)}.`;
}

function compactName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getBookedPct(assignments: ResourceAssignment[], personId: string, date: string, includeLeave: boolean) {
  return assignments
    .filter((assignment) => assignment.personId === personId && overlaps(date, assignment))
    .filter((assignment) => includeLeave || assignment.type !== "Leave")
    .reduce((total, assignment) => total + assignment.allocationPct, 0);
}

function getLeavePct(assignments: ResourceAssignment[], personId: string, date: string) {
  return assignments
    .filter((assignment) => assignment.personId === personId && assignment.type === "Leave" && overlaps(date, assignment))
    .reduce((total, assignment) => total + assignment.allocationPct, 0);
}

function getAvailablePct(assignments: ResourceAssignment[], personId: string, date: string) {
  return Math.max(0, 100 - getLeavePct(assignments, personId, date));
}

function getAssignmentRevenue(assignment: ResourceAssignment, people: ResourcePerson[] = resourcePeople) {
  const person = people.find((item) => item.id === assignment.personId);
  if (!person || assignment.type === "Leave" || assignment.type === "Bench") return 0;
  const days = assignmentDurationDays(assignment) + 1;
  return days * person.billRate * (assignment.allocationPct / 100);
}

function getAssignmentMargin(assignment: ResourceAssignment, people: ResourcePerson[] = resourcePeople) {
  const person = people.find((item) => item.id === assignment.personId);
  if (!person || assignment.type === "Leave" || assignment.type === "Bench") return 0;
  const days = assignmentDurationDays(assignment) + 1;
  return days * (person.billRate - person.costRate) * (assignment.allocationPct / 100);
}

function matchCandidates(demand: ResourceDemand, assignments: ResourceAssignment[], people: ResourcePerson[]): MatchResult[] {
  return people
    .filter((person) => person.employmentType !== "Corporate")
    .map((person) => {
      const matchingSkills = demand.requiredSkills.filter((skill) => person.skills.includes(skill));
      const skillFit = demand.requiredSkills.length === 0 ? 100 : Math.round((matchingSkills.length / demand.requiredSkills.length) * 100);
      const days = businessDays(demand.start, 10).filter((day) => day <= demand.end);
      const openDays = days.filter((day) => getBookedPct(assignments, person.id, day, false) + demand.allocationPct <= getAvailablePct(assignments, person.id, day)).length;
      const availabilityFit = days.length === 0 ? 0 : Math.round((openDays / days.length) * 100);
      const levelFit = person.level === demand.level ? 100 : person.level.includes("Principal") && demand.level.includes("Principal") ? 90 : 65;
      const locationFit = person.location === demand.location ? 100 : 75;
      const score = Math.round(skillFit * 0.45 + availabilityFit * 0.35 + levelFit * 0.12 + locationFit * 0.08);
      const explanation = [
        `${skillFit}% skill fit (${matchingSkills.length}/${demand.requiredSkills.length})`,
        `${availabilityFit}% availability in first fortnight`,
        person.location === demand.location ? "same location" : `based in ${person.location}`,
      ];
      return { person, score, skillFit, availabilityFit, explanation };
    })
    .sort((a, b) => b.score - a.score);
}

function encodeDrag(payload: DragPayload) {
  return JSON.stringify(payload);
}

function decodeDrag(value: string): DragPayload | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (!("kind" in parsed) || !("id" in parsed)) return null;
    if ((parsed.kind === "assignment" || parsed.kind === "demand") && typeof parsed.id === "string") {
      return { kind: parsed.kind, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

function buildExport(assignments: ResourceAssignment[], people: ResourcePerson[]) {
  const rows = [
    ["person_id", "person", "client", "project", "assignment_type", "status", "role", "start", "end", "allocation_pct", "source"],
    ...assignments.map((assignment) => {
      const person = people.find((item) => item.id === assignment.personId);
      const project = assignmentProject(assignment);
      return [
        assignment.personId ?? "UNFILLED",
        person?.name ?? "Unfilled demand",
        project.client,
        project.name,
        assignment.type,
        assignment.status,
        assignment.role,
        assignment.start,
        assignment.end,
        String(assignment.allocationPct),
        assignment.source,
      ];
    }),
  ];
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
}

export function ResourceCommandCentreClient({
  initialAssignments,
  initialAllocationHistory = [],
}: {
  initialAssignments?: ResourceAssignment[];
  initialAllocationHistory?: ResourceAllocationHistoryEntry[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("centre");
  const [people, setPeople] = useState<ResourcePerson[]>(resourcePeople);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>(initialAssignments ?? resourceAssignments);
  const [allocationHistory, setAllocationHistory] = useState<ResourceAllocationHistoryEntry[]>(() => {
    const persistedHistoryIds = new Set(initialAllocationHistory.map((entry) => entry.id));
    return [
      ...initialAllocationHistory,
      ...resourceAllocationHistory.filter((entry) => !persistedHistoryIds.has(entry.id)),
    ];
  });
  const [audit, setAudit] = useState<AuditEntry[]>(auditEntries);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(resourceAssignments[0]?.id ?? "");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedDemandId, setSelectedDemandId] = useState(resourceDemands[0]?.id ?? "");
  const [conflict, setConflict] = useState<ConflictDraft | null>(null);
  const [search, setSearch] = useState("");
  const [pillar, setPillar] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("");
  const [financeVisible, setFinanceVisible] = useState(true);
  const [overrideReason, setOverrideReason] = useState("Delivery continuity approved by COO");
  const [comment, setComment] = useState("@Maya please review this clash before Friday.");
  const [newMemberDraft, setNewMemberDraft] = useState<NewMemberDraft>(defaultNewMemberDraft);
  const [scheduleStartDate, setScheduleStartDate] = useState(TODAY);
  const [scheduleWindowDays, setScheduleWindowDays] = useState(130);

  const scheduleDays = useMemo(() => businessDays(scheduleStartDate, scheduleWindowDays), [scheduleStartDate, scheduleWindowDays]);
  const scheduleEndDate = scheduleDays[scheduleDays.length - 1] ?? scheduleStartDate;
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments[0];
  const selectedPerson = selectedPersonId ? people.find((person) => person.id === selectedPersonId) ?? null : null;
  const selectedDemand = resourceDemands.find((demand) => demand.id === selectedDemandId) ?? resourceDemands[0];
  const selectedMatches = useMemo(() => matchCandidates(selectedDemand, assignments, people), [assignments, people, selectedDemand]);
  const pillars = [...new Set(people.map((person) => person.pillar))];
  const skills = [...new Set(people.flatMap((person) => person.skills))].sort();

  const filteredPeople = people.filter((person) => {
    const haystack = `${person.employeeNo} ${person.name} ${person.role} ${person.level} ${person.manager} ${person.location} ${person.skills.join(" ")}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (pillar && person.pillar !== pillar) return false;
    if (skill && !person.skills.includes(skill)) return false;
    return true;
  });

  const dashboard = useMemo(() => {
    const buildWindow = (windowBusinessDays: number) =>
      buildResourceDashboardKpis({
        today: TODAY,
        people,
        assignments,
        demands: resourceDemands,
        timesheetActuals,
        financialActuals,
        windowBusinessDays,
      });
    return {
      today: buildWindow(1),
      next30: buildWindow(30),
      next90: buildWindow(90),
    };
  }, [assignments, people]);

  function appendAudit(action: string, record: string, summary: string) {
    const next: AuditEntry = {
      id: `aud-${Date.now()}`,
      actor: "COO / Resource Manager",
      action,
      record,
      summary,
      at: new Intl.DateTimeFormat("en-AU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    };
    setAudit((items) => [next, ...items]);
  }

  function openPersonDetail(personId: string) {
    setSelectedPersonId(personId);
  }

  function persistAssignment(assignment: ResourceAssignment, eventLabel: string, previous: ResourceAssignment | null = null) {
    const historySummary = describeAssignmentHistory(people, previous, assignment);
    const historyEntry: ResourceAllocationHistoryEntry = {
      id: `hist-${Date.now()}-${assignment.id}`,
      assignmentId: assignment.id,
      personId: assignment.personId,
      projectId: assignment.projectId,
      action: eventLabel,
      actor: "COO / Resource Manager",
      at: new Date().toISOString(),
      summary: historySummary,
      before: previous,
      after: assignment,
    };
    setAllocationHistory((items) => [historyEntry, ...items]);
    void saveResourcePlanningEvent({
      eventType: "planned-allocation",
      sourceRecordId: assignment.id,
      correlationId: `resource-plan-${Date.now()}`,
      canonicalAllocationId: assignment.id,
      canonicalPersonId: assignment.personId,
      canonicalProjectId: assignment.projectId,
      status: assignment.status,
      allocationType: assignment.type,
      role: assignment.role,
      startDate: assignment.start,
      endDate: assignment.end,
      allocationPct: assignment.allocationPct,
      confidencePct: assignment.confidence,
      payload: {
        eventLabel,
        assignmentId: assignment.id,
        personId: assignment.personId,
        projectId: assignment.projectId,
        status: assignment.status,
        type: assignment.type,
        start: assignment.start,
        end: assignment.end,
        allocationPct: assignment.allocationPct,
        sourceOfTruth: "resource-app",
        actor: "COO / Resource Manager",
        historySummary,
        beforeAssignment: previous ? assignmentSnapshot(previous) : {},
        afterAssignment: assignmentSnapshot(assignment),
      },
    });
  }

  function addTeamMember() {
    const name = newMemberDraft.name.trim();
    if (!name) return;
    const nextNumber = people.length + 1;
    const skills = newMemberDraft.skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const created: ResourcePerson = {
      id: `p-custom-${Date.now()}`,
      employeeNo: `SIA-${String(nextNumber).padStart(3, "0")}`,
      name,
      role: newMemberDraft.role.trim() || "Consultant",
      level: newMemberDraft.level.trim() || "Consultant",
      pillar: newMemberDraft.pillar.trim() || "Unassigned",
      manager: newMemberDraft.manager.trim() || "Unassigned",
      location: newMemberDraft.location.trim() || "Unassigned",
      employmentType: newMemberDraft.employmentType.trim() || "Permanent",
      dailyCapacityHours: Number(newMemberDraft.dailyCapacityHours) || 8,
      skills: skills.length > 0 ? skills : ["Unspecified"],
      certifications: [],
      billRate: Number(newMemberDraft.billRate) || 0,
      costRate: Number(newMemberDraft.costRate) || 0,
      tags: ["new-team-member"],
    };
    setPeople((items) => [...items, created]);
    setSearch(name);
    setActiveTab("people");
    setSelectedPersonId(created.id);
    setNewMemberDraft(defaultNewMemberDraft);
    appendAudit("Added team member", created.name, `${created.employeeNo} added to ${created.pillar} with ${created.skills.join(", ")}.`);
    void saveResourcePlanningEvent({
      eventType: "team-member",
      sourceRecordId: created.id,
      correlationId: `resource-person-${Date.now()}`,
      payload: {
        personId: created.id,
        employeeNo: created.employeeNo,
        name: created.name,
        role: created.role,
        sourceOfTruth: "resource-app",
      },
    });
  }

  function moveAssignment(assignmentId: string, personId: string, date: string) {
    const current = assignments.find((assignment) => assignment.id === assignmentId);
    if (!current) return;
    const duration = assignmentDurationDays(current);
    const targetPerson = people.find((person) => person.id === personId);
    const updated = { ...current, personId, start: date, end: addDays(date, duration), source: "Manual schedule drag" };
    setAssignments((items) =>
      items.map((assignment) =>
        assignment.id === assignmentId
          ? updated
          : assignment,
      ),
    );
    setSelectedAssignmentId(assignmentId);
    appendAudit("Moved assignment", targetPerson?.name ?? "Unknown person", `${current.role} moved to ${formatDate(date)}.`);
    persistAssignment(updated, "Moved assignment", current);
  }

  function createAssignmentFromDemand(demand: ResourceDemand, person: ResourcePerson, date: string, mode: "confirmed" | "tentative" | "waiting" | "override") {
    const availablePct = getAvailablePct(assignments, person.id, date);
    const bookedPct = getBookedPct(assignments, person.id, date, false);
    const resultingPct = bookedPct + demand.allocationPct;
    if (mode === "confirmed" && resultingPct > availablePct) {
      setConflict({ demand, person, date, availablePct, bookedPct, resultingPct });
      setActiveTab("schedule");
      return;
    }
    const id = `asg-${Date.now()}`;
    const statusByMode: Record<typeof mode, AssignmentStatus> = {
      confirmed: "Confirmed",
      tentative: "Tentative",
      waiting: "Waiting List",
      override: "Confirmed",
    };
    const project = resourceProjects.find((item) => item.client === demand.client) ?? resourceProjects[0];
    const created: ResourceAssignment = {
      id,
      personId: person.id,
      projectId: project.id,
      type: "Billable",
      status: statusByMode[mode],
      role: demand.role,
      start: date,
      end: demand.end,
      allocationPct: demand.allocationPct,
      confidence: demand.confidence,
      source: mode === "override" ? "Approved over-allocation" : "Demand drag/drop",
      notes: demand.notes,
      override: mode === "override" ? { reason: overrideReason, approver: "COO / Resource Manager", expiryDate: addDays(date, 14) } : undefined,
    };
    setAssignments((items) => [created, ...items]);
    setSelectedAssignmentId(id);
    setConflict(null);
    appendAudit("Created assignment", `${person.name} / ${demand.client}`, `${demand.allocationPct}% ${demand.role} created from canonical opportunity ${demand.sourceOpportunityId}.`);
    persistAssignment(created, "Created assignment from demand");
  }

  function onDropCell(event: DragEvent<HTMLDivElement>, person: ResourcePerson, date: string) {
    event.preventDefault();
    const payload = decodeDrag(event.dataTransfer.getData("application/json"));
    if (!payload) return;
    if (payload.kind === "assignment") {
      moveAssignment(payload.id, person.id, date);
      return;
    }
    const demand = resourceDemands.find((item) => item.id === payload.id);
    if (demand) createAssignmentFromDemand(demand, person, date, "confirmed");
  }

  function resizeAssignment(days: number) {
    if (!selectedAssignment) return;
    const updated = { ...selectedAssignment, end: addDays(selectedAssignment.end, days) };
    setAssignments((items) =>
      items.map((assignment) =>
        assignment.id === selectedAssignment.id ? updated : assignment,
      ),
    );
    appendAudit("Resized assignment", selectedAssignment.role, `${days > 0 ? "Extended" : "Shortened"} assignment by ${Math.abs(days)} day(s).`);
    persistAssignment(updated, "Resized assignment", selectedAssignment);
  }

  function splitAssignment() {
    if (!selectedAssignment) return;
    const splitDate = addDays(selectedAssignment.start, Math.max(1, Math.floor(assignmentDurationDays(selectedAssignment) / 2)));
    if (splitDate >= selectedAssignment.end) return;
    const second: ResourceAssignment = {
      ...selectedAssignment,
      id: `asg-${Date.now()}`,
      start: addDays(splitDate, 1),
      source: "Split assignment",
      notes: `${selectedAssignment.notes} Split from ${selectedAssignment.id}.`,
    };
    setAssignments((items) =>
      items.map((assignment) => (assignment.id === selectedAssignment.id ? { ...assignment, end: splitDate } : assignment)).concat(second),
    );
    appendAudit("Split assignment", selectedAssignment.role, `Split at ${formatDate(splitDate)} with daily history retained.`);
    persistAssignment({ ...selectedAssignment, end: splitDate }, "Split assignment first segment", selectedAssignment);
    persistAssignment(second, "Split assignment second segment");
  }

  function approveSelectedOverride() {
    if (!selectedAssignment) return;
    const updated = {
      ...selectedAssignment,
      status: "Confirmed" as const,
      override: { reason: overrideReason, approver: "COO / Resource Manager", expiryDate: addDays(TODAY, 14) },
    };
    setAssignments((items) =>
      items.map((assignment) =>
        assignment.id === selectedAssignment.id
          ? updated
          : assignment,
      ),
    );
    appendAudit("Approved exception", selectedAssignment.role, `${overrideReason}; expires ${formatDate(addDays(TODAY, 14))}.`);
    persistAssignment(updated, "Approved exception", selectedAssignment);
  }

  function addComment() {
    if (!selectedAssignment) return;
    appendAudit("Commented", selectedAssignment.role, comment);
  }

  function downloadCsv() {
    const blob = new Blob([buildExport(assignments, people)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "simplyai-resource-plan.csv";
    link.click();
    URL.revokeObjectURL(url);
    appendAudit("Exported plan", "Resource plan", "CSV export generated from current live plan.");
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-14 lg:pt-0">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles size={14} /> MLVizz canonical contract: {mlvizzSnapshot.metadata.schemaVersion}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Simplyai Resource Command Centre</h1>
            <p className="mt-1 max-w-4xl text-sm text-slate-600">
              Live planning workspace using canonical MLVizz enterprise data plus application-owned allocation, hold and approval changes saved immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFinanceVisible((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Lock size={16} /> {financeVisible ? "Hide finance" : "Show finance"}
            </button>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Download size={16} /> Export plan
            </button>
          </div>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="space-y-6 p-6">
        <FreshnessBanner />
        <FilterBar search={search} setSearch={setSearch} pillar={pillar} setPillar={setPillar} skill={skill} setSkill={setSkill} status={status} setStatus={setStatus} pillars={pillars} skills={skills} />
        {activeTab === "centre" && <CommandCentre dashboard={dashboard} financeVisible={financeVisible} setActiveTab={setActiveTab} />}
        {activeTab === "schedule" && (
          <Schedule
            assignments={assignments}
            people={filteredPeople}
            days={scheduleDays}
            scheduleStartDate={scheduleStartDate}
            scheduleEndDate={scheduleEndDate}
            scheduleWindowDays={scheduleWindowDays}
            setScheduleWindowDays={setScheduleWindowDays}
            setScheduleStartDate={setScheduleStartDate}
            selectedAssignment={selectedAssignment}
            selectedDemand={selectedDemand}
            selectedMatches={selectedMatches}
            conflict={conflict}
            overrideReason={overrideReason}
            setOverrideReason={setOverrideReason}
            setSelectedAssignmentId={setSelectedAssignmentId}
            onOpenPerson={openPersonDetail}
            onDropCell={onDropCell}
            resizeAssignment={resizeAssignment}
            splitAssignment={splitAssignment}
            approveSelectedOverride={approveSelectedOverride}
            createAssignmentFromDemand={createAssignmentFromDemand}
          />
        )}
        {activeTab === "demand" && (
          <DemandPanel assignments={assignments} selectedDemandId={selectedDemandId} setSelectedDemandId={setSelectedDemandId} selectedMatches={selectedMatches} createAssignmentFromDemand={createAssignmentFromDemand} onOpenPerson={openPersonDetail} />
        )}
        {activeTab === "people" && <PeopleDirectory people={filteredPeople} assignments={assignments} financeVisible={financeVisible} draft={newMemberDraft} setDraft={setNewMemberDraft} addTeamMember={addTeamMember} onOpenPerson={openPersonDetail} />}
        {activeTab === "bench" && <BenchView people={filteredPeople} assignments={assignments} onOpenPerson={openPersonDetail} />}
        {activeTab === "migration" && <MigrationReview />}
        {activeTab === "approvals" && <ApprovalsAudit assignments={assignments} people={people} audit={audit} selectedAssignment={selectedAssignment} comment={comment} setComment={setComment} addComment={addComment} approveSelectedOverride={approveSelectedOverride} onOpenPerson={openPersonDetail} />}
      </main>
      {selectedPerson && (
        <PersonDetailModal
          person={selectedPerson}
          assignments={assignments}
          allocationHistory={allocationHistory}
          financeVisible={financeVisible}
          onClose={() => setSelectedPersonId(null)}
        />
      )}
    </div>
  );
}

function PersonNameLink({ person, onOpenPerson, className = "" }: { person: ResourcePerson; onOpenPerson: (personId: string) => void; className?: string }) {
  function open() {
    onOpenPerson(person.id);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      open();
    }
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        open();
      }}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer font-bold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
    >
      {person.name}
    </span>
  );
}

function PersonDetailModal({
  person,
  assignments,
  allocationHistory,
  financeVisible,
  onClose,
}: {
  person: ResourcePerson;
  assignments: ResourceAssignment[];
  allocationHistory: ResourceAllocationHistoryEntry[];
  financeVisible: boolean;
  onClose: () => void;
}) {
  const personAssignments = assignments
    .filter((assignment) => assignment.personId === person.id)
    .sort((a, b) => a.start.localeCompare(b.start));
  const history = allocationHistory.filter((entry) => entry.personId === person.id || entry.before?.personId === person.id || entry.after?.personId === person.id);
  const currentLoad = getBookedPct(assignments, person.id, TODAY, false);
  const availableToday = getAvailablePct(assignments, person.id, TODAY);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[92vh] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{person.employeeNo} · {person.pillar}</div>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{person.name}</h2>
            <p className="text-sm text-slate-500">{person.role} · {person.level} · {person.location} · Manager: {person.manager}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close person detail"><X size={18} /></button>
        </div>
        <div className="overflow-auto p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <DrawerField label="Current load" value={`${pct(currentLoad)} / ${pct(availableToday)}`} />
            <DrawerField label="Capacity" value={`${person.dailyCapacityHours}h/day`} />
            <DrawerField label="Employment" value={person.employmentType} />
            <DrawerField label="Rates" value={financeVisible ? `${money(person.billRate)} / ${money(person.costRate)}` : "Restricted"} />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-950">Skills and tags</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...person.skills, ...person.certifications, ...person.tags].map((item, index) => <span key={`${item}-${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item}</span>)}
            </div>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-950">Current and future allocations</h3>
              <div className="mt-3 space-y-3">
                {personAssignments.map((assignment) => {
                  const project = assignmentProject(assignment);
                  return (
                    <div key={assignment.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-950">{project.client} · {assignment.role}</div>
                          <div className="text-xs text-slate-500">{assignment.start} to {assignment.end} · {assignment.source}</div>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{assignment.status}</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{pct(assignment.allocationPct)} · {assignment.type} · {pct(assignment.confidence)} confidence</div>
                    </div>
                  );
                })}
                {personAssignments.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No current allocations for this person.</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-950">Allocation history</h3>
              <p className="mt-1 text-sm text-slate-500">Preserved from MLVizz imports and every app-owned scheduling edit.</p>
              <div className="mt-3 max-h-[420px] space-y-3 overflow-auto pr-1">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-950">{entry.action}</span>
                      <span className="text-xs text-slate-500">{formatHistoryDate(entry.at)}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{entry.summary}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.actor} · {entry.assignmentId}</div>
                  </div>
                ))}
                {history.length === 0 && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No allocation history recorded for this person yet.</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreshnessBanner() {
  const failed = mlvizzFreshness.filter((item) => item.status === "failed");
  const stale = mlvizzFreshness.filter((item) => item.status === "stale" || item.status === "warning");
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
            <Clock3 size={16} /> MLVizz freshness and last-known-good status
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Pack {mlvizzSnapshot.metadata.packId}; published {formatTimestamp(mlvizzSnapshot.metadata.mlvizzPublishedAt)}; app ingested{" "}
            {formatTimestamp(mlvizzSnapshot.metadata.applicationIngestedAt)}. Planning edits are saved in the app database immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mlvizzFreshness.slice(0, 6).map((item) => (
            <span
              key={`${item.datasetName}-${item.sourceSystem}`}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                item.status === "failed" ? "bg-red-100 text-red-700" : item.status === "warning" || item.status === "stale" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {item.datasetName}: {item.status}
            </span>
          ))}
        </div>
      </div>
      {(failed.length > 0 || stale.length > 0) && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mr-2 inline" size={16} />
          Some MLVizz datasets need review. Last-known-good data remains active and schedule edits are not blocked.
        </div>
      )}
    </section>
  );
}

function FilterBar({
  search,
  setSearch,
  pillar,
  setPillar,
  skill,
  setSkill,
  status,
  setStatus,
  pillars,
  skills,
}: {
  search: string;
  setSearch: (value: string) => void;
  pillar: string;
  setPillar: (value: string) => void;
  skill: string;
  setSkill: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  pillars: string[];
  skills: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people, managers, roles…"
            className="w-72 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select value={pillar} onChange={(event) => setPillar(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">All pillars</option>
          {pillars.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={skill} onChange={(event) => setSkill(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">All skills</option>
          {skills.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">All assignment statuses</option>
          <option>Confirmed</option>
          <option>Tentative</option>
          <option>Waiting List</option>
          <option>At Risk</option>
        </select>
        <div className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Filter size={14} /> Filters apply across schedule, people and bench views
        </div>
      </div>
    </section>
  );
}

function CommandCentre({
  dashboard,
  financeVisible,
  setActiveTab,
}: {
  dashboard: { today: ResourceDashboardKpis; next30: ResourceDashboardKpis; next90: ResourceDashboardKpis };
  financeVisible: boolean;
  setActiveTab: (tab: Tab) => void;
}) {
  const kpis = dashboard.next30;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="30-day billable util." value={pct(kpis.utilisationPct)} sub={`${formatFteDays(kpis.committedDeliveryHours)} committed of ${formatFteDays(kpis.availableHours)} available`} icon={<UserCheck size={18} />} />
        <MetricCard label="Pipeline demand" value={formatFteDays(kpis.pipelineWeightedHours)} sub={`${pct(kpis.pipelineCapacityPct)} of 30-day capacity after confidence weighting`} icon={<Sparkles size={18} />} />
        <MetricCard label="Over-allocation" value={formatFteDays(kpis.overAllocatedHours)} sub={`${kpis.overAllocatedPersonDays} person-days above available capacity`} tone="danger" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Bench capacity" value={formatFteDays(kpis.benchHours)} sub="Available person-days after scheduled work and leave" tone="amber" icon={<Clock3 size={18} />} />
        <MetricCard label="Ending soon" value={kpis.endingSoon} sub="Confirmed/tentative assignments ending within 21 days" icon={<ArrowRightLeft size={18} />} />
        <MetricCard label="Paid actuals" value={financeVisible ? money(kpis.paidRevenue) : "Restricted"} sub={financeVisible ? `${money(kpis.invoicedRevenue)} invoiced net` : "Finance-only field"} icon={<Lock size={18} />} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Operating control view</h2>
              <p className="text-sm text-slate-500">Current, 30-day and 90-day capacity are derived from daily assignments, leave and working patterns.</p>
            </div>
            <button onClick={() => setActiveTab("schedule")} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Open schedule</button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CapacityBand label="Today" available={pct(dashboard.today.availabilityPct)} committed={pct(dashboard.today.utilisationPct)} tentative={pct(dashboard.today.tentativePct)} />
            <CapacityBand label="Next 30 days" available={pct(kpis.availabilityPct)} committed={pct(kpis.utilisationPct)} tentative={pct(kpis.tentativePct)} />
            <CapacityBand label="Next 90 days" available={pct(dashboard.next90.availabilityPct)} committed={pct(dashboard.next90.utilisationPct)} tentative={pct(dashboard.next90.tentativePct)} />
          </div>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            Weekly digest: resolve Charlie’s 140% clash, confirm Ben’s CBA/Powerlink alternative, and fill Cleanaway’s 60% Data Engineer demand before 18 Jul.
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Action panels</h2>
          <div className="mt-4 space-y-3">
            <ActionItem title="3 unfilled demand records" body="Drag qualified canonical demand onto matched people." tab="demand" setActiveTab={setActiveTab} />
            <ActionItem title="2 approval exceptions" body="Over-allocation and waiting-list records need decision history." tab="approvals" setActiveTab={setActiveTab} />
            <ActionItem title="MLVizz sync controls" body="Freshness, reconciliation and failed-record quarantine are tracked." tab="migration" setActiveTab={setActiveTab} />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, tone = "blue" }: { label: string; value: string | number; sub: string; icon: React.ReactNode; tone?: "blue" | "danger" | "amber" }) {
  const toneClass = tone === "danger" ? "text-red-600 bg-red-50" : tone === "amber" ? "text-amber-700 bg-amber-50" : "text-blue-700 bg-blue-50";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span className={`rounded-lg p-2 ${toneClass}`}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function CapacityBand({ label, available, committed, tentative }: { label: string; available: string; committed: string; tentative: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-bold text-slate-900">{label}</div>
      <div className="mt-3 space-y-2 text-xs text-slate-500">
        <Progress label="Available" value={available} className="bg-emerald-500" />
        <Progress label="Committed" value={committed} className="bg-blue-700" />
        <Progress label="Tentative" value={tentative} className="bg-purple-500" />
      </div>
    </div>
  );
}

function Progress({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between"><span>{label}</span><span>{value}</span></div>
      <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${className}`} style={{ width: value }} /></div>
    </div>
  );
}

function ActionItem({ title, body, tab, setActiveTab }: { title: string; body: string; tab: Tab; setActiveTab: (tab: Tab) => void }) {
  return (
    <button onClick={() => setActiveTab(tab)} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50">
      <div className="font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{body}</div>
    </button>
  );
}

function Schedule({
  assignments,
  people,
  days,
  scheduleStartDate,
  scheduleEndDate,
  scheduleWindowDays,
  setScheduleWindowDays,
  setScheduleStartDate,
  selectedAssignment,
  selectedDemand,
  selectedMatches,
  conflict,
  overrideReason,
  setOverrideReason,
  setSelectedAssignmentId,
  onOpenPerson,
  onDropCell,
  resizeAssignment,
  splitAssignment,
  approveSelectedOverride,
  createAssignmentFromDemand,
}: {
  assignments: ResourceAssignment[];
  people: ResourcePerson[];
  days: string[];
  scheduleStartDate: string;
  scheduleEndDate: string;
  scheduleWindowDays: number;
  setScheduleWindowDays: (days: number) => void;
  setScheduleStartDate: (date: string) => void;
  selectedAssignment?: ResourceAssignment;
  selectedDemand: ResourceDemand;
  selectedMatches: MatchResult[];
  conflict: ConflictDraft | null;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  setSelectedAssignmentId: (id: string) => void;
  onOpenPerson: (personId: string) => void;
  onDropCell: (event: DragEvent<HTMLDivElement>, person: ResourcePerson, date: string) => void;
  resizeAssignment: (days: number) => void;
  splitAssignment: () => void;
  approveSelectedOverride: () => void;
  createAssignmentFromDemand: (demand: ResourceDemand, person: ResourcePerson, date: string, mode: "confirmed" | "tentative" | "waiting" | "override") => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950">Daily schedule</h2>
            <p className="text-sm text-slate-500">Drag assignment cards or demand items onto a person and date. Showing {days.length} business days from {formatDate(scheduleStartDate)} to {formatDate(scheduleEndDate)}.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 text-xs text-slate-600">
            <button type="button" onClick={() => setScheduleStartDate(addDays(scheduleStartDate, -30))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50"><ChevronLeft size={14} /> 1 month</button>
            <button type="button" onClick={() => setScheduleStartDate(TODAY)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50"><CalendarDays size={14} /> Today</button>
            <button type="button" onClick={() => setScheduleStartDate(addDays(scheduleStartDate, 30))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50">1 month <ChevronRight size={14} /></button>
            <button type="button" onClick={() => setScheduleStartDate(addDays(scheduleStartDate, 90))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50">1 quarter <ChevronRight size={14} /></button>
            <select value={scheduleWindowDays} onChange={(event) => setScheduleWindowDays(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold">
              <option value={30}>30 business days</option>
              <option value={65}>65 business days</option>
              <option value={130}>130 business days</option>
            </select>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <div className="min-w-[1180px]">
            <div className="sticky top-0 z-30 grid border-b border-slate-200 bg-slate-50 shadow-sm" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(92px, 1fr))` }}>
              <div className="sticky left-0 top-0 z-40 border-r border-slate-200 bg-slate-50 p-3 text-xs font-bold uppercase tracking-wide text-slate-500">Person</div>
              {days.map((day) => (
                <div key={day} className="sticky top-0 z-30 border-r border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-600">{formatDate(day)}</div>
              ))}
            </div>
            {people.map((person) => (
              <div key={person.id} className="grid border-b border-slate-100" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(92px, 1fr))` }}>
                <div className="sticky left-0 z-10 border-r border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{compactName(person.name)}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm"><PersonNameLink person={person} onOpenPerson={onOpenPerson} className="text-sm" /></div>
                      <div className="truncate text-xs text-slate-500">{person.level} · {person.location}</div>
                    </div>
                  </div>
                </div>
                {days.map((day) => {
                  const dailyAssignments = assignments.filter((assignment) => assignment.personId === person.id && overlaps(day, assignment));
                  const bookedPct = getBookedPct(assignments, person.id, day, false);
                  const availablePct = getAvailablePct(assignments, person.id, day);
                  const over = bookedPct > availablePct;
                  return (
                    <div
                      key={`${person.id}-${day}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onDropCell(event, person, day)}
                      className={`min-h-28 border-r border-slate-100 p-1.5 ${over ? "bg-red-50" : availablePct === 0 ? "bg-slate-100" : "bg-white"}`}
                    >
                      <div className={`mb-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${over ? "bg-red-100 text-red-700" : availablePct - bookedPct >= 50 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                        {pct(bookedPct)} / {pct(availablePct)}
                      </div>
                      <div className="space-y-1">
                        {dailyAssignments.slice(0, 3).map((assignment) => {
                          const project = assignmentProject(assignment);
                          return (
                            <button
                              key={assignment.id}
                              draggable
                              onDragStart={(event) => event.dataTransfer.setData("application/json", encodeDrag({ kind: "assignment", id: assignment.id }))}
                              onClick={() => setSelectedAssignmentId(assignment.id)}
                              className={`w-full rounded-md border px-2 py-1 text-left text-[11px] shadow-sm ${typeClasses[assignment.type]} ${statusClasses[assignment.status]} ${selectedAssignment?.id === assignment.id ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                            >
                              <div className="truncate font-bold">{project.client} · {assignment.allocationPct}%</div>
                              <div className="truncate opacity-90">{assignment.role}</div>
                            </button>
                          );
                        })}
                        {dailyAssignments.length > 3 && <div className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">+{dailyAssignments.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-950"><PanelRightOpen size={18} /> Assignment drawer</h3>
          {selectedAssignment ? <AssignmentDrawer assignment={selectedAssignment} people={people} resizeAssignment={resizeAssignment} splitAssignment={splitAssignment} approveSelectedOverride={approveSelectedOverride} overrideReason={overrideReason} setOverrideReason={setOverrideReason} onOpenPerson={onOpenPerson} /> : <p className="mt-3 text-sm text-slate-500">Select an assignment to inspect details.</p>}
        </section>
        {conflict && (
          <section className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm">
            <h3 className="flex items-center gap-2 font-bold text-red-900"><AlertTriangle size={18} /> Conflict workflow</h3>
            <p className="mt-2 text-sm text-red-800">
              <PersonNameLink person={conflict.person} onOpenPerson={onOpenPerson} className="text-sm text-red-900 decoration-red-300" /> would reach {pct(conflict.resultingPct)} on {formatDate(conflict.date)} against {pct(conflict.availablePct)} available capacity.
            </p>
            <div className="mt-3 space-y-2">
              <input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm" />
              <button onClick={() => createAssignmentFromDemand(conflict.demand, conflict.person, conflict.date, "tentative")} className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700">Add as tentative hold</button>
              <button onClick={() => createAssignmentFromDemand(conflict.demand, conflict.person, conflict.date, "waiting")} className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700">Add to waiting list</button>
              <button onClick={() => createAssignmentFromDemand(conflict.demand, conflict.person, conflict.date, "override")} className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">Approve time-limited exception</button>
            </div>
          </section>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-950">Unfilled demand</h3>
          <div className="mt-3 space-y-2">
            {resourceDemands.map((demand) => (
              <button
                key={demand.id}
                draggable
                onDragStart={(event) => event.dataTransfer.setData("application/json", encodeDrag({ kind: "demand", id: demand.id }))}
                className="w-full rounded-xl border border-dashed border-blue-300 bg-blue-50 p-3 text-left hover:bg-blue-100"
              >
                <div className="font-bold text-blue-950">{demand.client} · {demand.role}</div>
                <div className="text-xs text-blue-700">{demand.allocationPct}% · {demand.stage} · expires {formatDate(demand.expiryDate)}</div>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-950">Best match for selected demand</h3>
          <div className="mt-3 space-y-3">
            {selectedMatches.slice(0, 3).map((match) => (
              <button key={match.person.id} onClick={() => createAssignmentFromDemand(selectedDemand, match.person, selectedDemand.start, "confirmed")} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300">
                <div className="flex items-center justify-between"><PersonNameLink person={match.person} onOpenPerson={onOpenPerson} /><span className="text-sm font-bold text-blue-700">{match.score}</span></div>
                <div className="mt-1 text-xs text-slate-500">{match.explanation.join(" · ")}</div>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function AssignmentDrawer({
  assignment,
  people,
  resizeAssignment,
  splitAssignment,
  approveSelectedOverride,
  overrideReason,
  setOverrideReason,
  onOpenPerson,
}: {
  assignment: ResourceAssignment;
  people: ResourcePerson[];
  resizeAssignment: (days: number) => void;
  splitAssignment: () => void;
  approveSelectedOverride: () => void;
  overrideReason: string;
  setOverrideReason: (value: string) => void;
  onOpenPerson: (personId: string) => void;
}) {
  const person = people.find((item) => item.id === assignment.personId);
  const project = assignmentProject(assignment);
  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{project.client} / {project.code}</div>
        <div className="text-lg font-bold text-slate-950">{assignment.role}</div>
        <div className="text-sm text-slate-500">{person ? <PersonNameLink person={person} onOpenPerson={onOpenPerson} className="text-sm" /> : "Unfilled"} · {assignment.start} to {assignment.end}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <DrawerField label="Allocation" value={pct(assignment.allocationPct)} />
        <DrawerField label="Status" value={assignment.status} />
        <DrawerField label="Billability" value={assignment.type} />
        <DrawerField label="Confidence" value={pct(assignment.confidence)} />
        <DrawerField label="Revenue" value={money(getAssignmentRevenue(assignment, people))} />
        <DrawerField label="Margin" value={money(getAssignmentMargin(assignment, people))} />
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{assignment.notes}</div>
      {assignment.override && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Approved by {assignment.override.approver}; expires {formatDate(assignment.override.expiryDate)}. Reason: {assignment.override.reason}
        </div>
      )}
      <div className="space-y-2">
        <input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => resizeAssignment(5)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Extend 5 days</button>
          <button onClick={() => resizeAssignment(-5)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Shorten 5 days</button>
          <button onClick={splitAssignment} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><SplitSquareHorizontal className="mr-1 inline" size={14} />Split</button>
          <button onClick={approveSelectedOverride} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
        </div>
      </div>
    </div>
  );
}

function DrawerField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function DemandPanel({
  assignments,
  selectedDemandId,
  setSelectedDemandId,
  selectedMatches,
  createAssignmentFromDemand,
  onOpenPerson,
}: {
  assignments: ResourceAssignment[];
  selectedDemandId: string;
  setSelectedDemandId: (id: string) => void;
  selectedMatches: MatchResult[];
  createAssignmentFromDemand: (demand: ResourceDemand, person: ResourcePerson, date: string, mode: "confirmed" | "tentative" | "waiting" | "override") => void;
  onOpenPerson: (personId: string) => void;
}) {
  const selectedDemand = resourceDemands.find((item) => item.id === selectedDemandId) ?? resourceDemands[0];
  const demandLoad = resourceDemands.reduce((total, demand) => total + demand.allocationPct * demand.confidence / 100, 0);
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Demand board</h2>
        <p className="mt-1 text-sm text-slate-500">Canonical opportunity stages create aggregate forecast, placeholder demand or committed assignments depending on configuration.</p>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><b>{Math.round(demandLoad)}%</b> weighted allocation demand across qualified and proposed opportunities.</div>
        <div className="mt-4 space-y-3">
          {resourceDemands.map((demand) => (
            <button key={demand.id} onClick={() => setSelectedDemandId(demand.id)} className={`w-full rounded-xl border p-4 text-left ${selectedDemandId === demand.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <div className="flex items-center justify-between"><span className="font-bold text-slate-950">{demand.client}</span><span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">{demand.stage}</span></div>
              <div className="mt-1 text-sm text-slate-600">{demand.role} · {demand.allocationPct}% · {demand.level}</div>
              <div className="mt-2 flex flex-wrap gap-1">{demand.requiredSkills.map((item) => <span key={item} className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{item}</span>)}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Candidate matching</h2>
        <p className="mt-1 text-sm text-slate-500">Deterministic score blends skills, first-fortnight availability, level and location. Every recommendation includes its explanation.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {selectedMatches.slice(0, 8).map((match) => (
            <div key={match.person.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3><PersonNameLink person={match.person} onOpenPerson={onOpenPerson} /></h3>
                  <p className="text-sm text-slate-500">{match.person.role} · {match.person.pillar}</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2 text-center"><div className="text-lg font-bold text-blue-700">{match.score}</div><div className="text-[10px] font-bold uppercase text-blue-500">match</div></div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {match.explanation.map((item) => <div key={item}>• {item}</div>)}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => createAssignmentFromDemand(selectedDemand, match.person, selectedDemand.start, "confirmed")} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Assign</button>
                <button onClick={() => createAssignmentFromDemand(selectedDemand, match.person, selectedDemand.start, "tentative")} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700">Tentative</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Current assignments considered: {assignments.length}. The matching engine ignores name joins and uses stable person IDs.
        </div>
      </section>
    </div>
  );
}

function PeopleDirectory({ people, assignments, financeVisible, draft, setDraft, addTeamMember, onOpenPerson }: { people: ResourcePerson[]; assignments: ResourceAssignment[]; financeVisible: boolean; draft: NewMemberDraft; setDraft: (draft: NewMemberDraft) => void; addTeamMember: () => void; onOpenPerson: (personId: string) => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-950">People & skills directory</h2>
        <p className="text-sm text-slate-500">Stable IDs, working patterns, skills, certifications, locations and controlled rate visibility.</p>
      </div>
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <div className="mb-3 flex items-center gap-2 font-bold text-slate-950">
          <UserPlus size={18} /> Add team member
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MemberInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} placeholder="e.g. Morgan Lee" />
          <MemberInput label="Role" value={draft.role} onChange={(value) => setDraft({ ...draft, role: value })} />
          <MemberInput label="Level" value={draft.level} onChange={(value) => setDraft({ ...draft, level: value })} />
          <MemberInput label="Pillar" value={draft.pillar} onChange={(value) => setDraft({ ...draft, pillar: value })} />
          <MemberInput label="Manager" value={draft.manager} onChange={(value) => setDraft({ ...draft, manager: value })} />
          <MemberInput label="Location" value={draft.location} onChange={(value) => setDraft({ ...draft, location: value })} />
          <MemberInput label="Employment type" value={draft.employmentType} onChange={(value) => setDraft({ ...draft, employmentType: value })} />
          <MemberInput label="Daily hours" value={draft.dailyCapacityHours} onChange={(value) => setDraft({ ...draft, dailyCapacityHours: value })} />
          <MemberInput label="Skills" value={draft.skills} onChange={(value) => setDraft({ ...draft, skills: value })} className="xl:col-span-2" />
          <MemberInput label="Bill rate" value={draft.billRate} onChange={(value) => setDraft({ ...draft, billRate: value })} />
          <MemberInput label="Cost rate" value={draft.costRate} onChange={(value) => setDraft({ ...draft, costRate: value })} />
        </div>
        <button
          onClick={addTeamMember}
          disabled={!draft.name.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus size={16} /> Add team member
        </button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Pillar</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Skills</th>
              <th className="px-4 py-3">Current load</th>
              <th className="px-4 py-3">Rates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((person) => {
              const currentLoad = getBookedPct(assignments, person.id, TODAY, false);
              return (
                <tr key={person.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><div><PersonNameLink person={person} onOpenPerson={onOpenPerson} /></div><div className="text-xs text-slate-500">{person.employeeNo} · {person.role}</div></td>
                  <td className="px-4 py-3">{person.pillar}</td>
                  <td className="px-4 py-3">{person.manager}</td>
                  <td className="px-4 py-3">{person.location}</td>
                  <td className="px-4 py-3"><div className="flex max-w-xl flex-wrap gap-1">{person.skills.map((item) => <span key={item} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{item}</span>)}</div></td>
                  <td className="px-4 py-3"><span className={currentLoad > getAvailablePct(assignments, person.id, TODAY) ? "font-bold text-red-600" : "font-bold text-slate-700"}>{pct(currentLoad)}</span></td>
                  <td className="px-4 py-3">{financeVisible ? `${money(person.billRate)} / ${money(person.costRate)}` : <span className="text-slate-400">Restricted</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MemberInput({ label, value, onChange, placeholder, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
      />
    </label>
  );
}

function BenchView({ people, assignments, onOpenPerson }: { people: ResourcePerson[]; assignments: ResourceAssignment[]; onOpenPerson: (personId: string) => void }) {
  const days = businessDays(TODAY, 10);
  const rows = people.map((person) => {
    const remaining = days.map((day) => getAvailablePct(assignments, person.id, day) - getBookedPct(assignments, person.id, day, false));
    const avg = Math.round(remaining.reduce((total, item) => total + item, 0) / remaining.length);
    const ending = assignments.find((assignment) => assignment.personId === person.id && assignment.end >= TODAY && assignment.end <= addDays(TODAY, 21) && assignment.type !== "Leave");
    return { person, avg, ending };
  }).sort((a, b) => b.avg - a.avg);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Bench & redeployment</h2>
      <p className="mt-1 text-sm text-slate-500">Bench is calculated from remaining daily capacity after leave and confirmed work.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ person, avg, ending }) => (
          <div key={person.id} className={`rounded-2xl border p-4 ${avg >= 50 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between"><h3><PersonNameLink person={person} onOpenPerson={onOpenPerson} /></h3><span className="text-lg font-bold text-slate-900">{pct(avg)}</span></div>
            <div className="mt-1 text-sm text-slate-500">avg remaining next 10 business days</div>
            <div className="mt-3 flex flex-wrap gap-1">{person.tags.map((item) => <span key={item} className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{item}</span>)}</div>
            {ending && <div className="mt-3 rounded-lg bg-blue-50 p-2 text-xs font-semibold text-blue-700">Ending soon: {assignmentProject(ending).client} on {formatDate(ending.end)}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

function MigrationReview() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><FileSpreadsheet size={19} /> MLVizz synchronisation and reconciliation</h2>
          <p className="text-sm text-slate-500">Canonical provider output, data-quality exceptions and open integration decisions are visible without coupling the UI to source-system payloads.</p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Resolution</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {migrationIssues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${issue.severity === "Critical" ? "bg-red-100 text-red-700" : issue.severity === "Warning" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{issue.severity}</span></td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{issue.area}</td>
                  <td className="px-4 py-3 text-slate-500">{issue.record}</td>
                  <td className="px-4 py-3 max-w-md text-slate-700">{issue.issue}</td>
                  <td className="px-4 py-3 max-w-md text-slate-600">{issue.proposedResolution}</td>
                  <td className="px-4 py-3">{issue.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">Canonical data summary</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <SummaryLine label="Provider" value="MockMLVizzProvider" />
          <SummaryLine label="People" value={String(mlvizzSnapshot.people.length)} />
          <SummaryLine label="Identity mappings" value={String(identityMappings.length)} />
          <SummaryLine label="Submitted actual entries" value={String(timesheetActuals.filter((item) => item.approvalStatus === "submitted").length)} />
          <SummaryLine label="Approved actual entries" value={String(timesheetActuals.filter((item) => item.approvalStatus === "approved").length)} />
          <SummaryLine label="Invoices" value={String(financialActuals.length)} />
          <SummaryLine label="Paid invoices" value={String(financialActuals.filter((item) => item.status === "paid").length)} />
          <SummaryLine label="Reconciliation variances" value={String(reconciliationSummaries.reduce((total, item) => total + item.varianceCount, 0))} />
        </div>
        <div className="mt-5 space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck size={16} /> Refresh history</h4>
          {mlvizzFreshness.map((item) => (
            <div key={`${item.datasetName}-${item.sourceSystem}`} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-900">{item.datasetName} / {item.sourceSystem}</span>
                <span className={item.status === "failed" ? "text-red-700" : item.status === "fresh" ? "text-emerald-700" : "text-amber-700"}>{item.status}</span>
              </div>
              <p className="mt-1">Accepted {item.recordsAccepted}; rejected {item.recordsRejected}; last success {formatTimestamp(item.lastSuccessfulRefreshAt)}.</p>
              {item.failureSummary && <p className="mt-1 font-semibold text-amber-700">{item.failureSummary}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b border-slate-100 pb-2"><span>{label}</span><b className="text-slate-950">{value}</b></div>;
}

function ApprovalsAudit({
  assignments,
  people,
  audit,
  selectedAssignment,
  comment,
  setComment,
  addComment,
  approveSelectedOverride,
  onOpenPerson,
}: {
  assignments: ResourceAssignment[];
  people: ResourcePerson[];
  audit: AuditEntry[];
  selectedAssignment?: ResourceAssignment;
  comment: string;
  setComment: (value: string) => void;
  addComment: () => void;
  approveSelectedOverride: () => void;
  onOpenPerson: (personId: string) => void;
}) {
  const approvals = assignments.filter((assignment) => {
    if (!assignment.personId || assignment.type === "Leave") return false;
    const days = businessDays(assignment.start, 5);
    return assignment.status === "At Risk" || assignment.status === "Waiting List" || days.some((day) => getBookedPct(assignments, assignment.personId ?? "", day, false) > getAvailablePct(assignments, assignment.personId ?? "", day));
  });
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><ShieldCheck size={18} /> Approval queue</h2>
        <div className="mt-4 space-y-3">
          {approvals.map((assignment) => {
            const person = people.find((item) => item.id === assignment.personId);
            return (
              <div key={assignment.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="font-bold text-red-950">{person ? <PersonNameLink person={person} onOpenPerson={onOpenPerson} className="text-red-950 decoration-red-300" /> : "Unfilled"} · {assignment.role}</div>
                <div className="mt-1 text-sm text-red-800">{assignment.status} · {pct(assignment.allocationPct)} · {formatDate(assignment.start)} to {formatDate(assignment.end)}</div>
                {selectedAssignment?.id === assignment.id && <button onClick={approveSelectedOverride} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">Approve selected exception</button>}
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 font-bold text-slate-950"><MessageSquare size={16} /> Comments and mentions</h3>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-3 h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" />
          <button onClick={addComment} className="mt-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Add comment</button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Audit history</h2>
        <div className="mt-4 space-y-3">
          {audit.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold text-slate-950">{entry.action}</span><span className="text-xs text-slate-500">{entry.at}</span></div>
              <div className="mt-1 text-sm text-slate-600">{entry.summary}</div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{entry.actor} · {entry.record}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
