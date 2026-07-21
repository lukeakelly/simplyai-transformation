import type { HubSpotProvider, HubSpotProviderOptions } from "./provider";
import type {
  HubSpotCompany,
  HubSpotContact,
  HubSpotDeal,
  HubSpotEngagement,
  HubSpotOwner,
  HubSpotSnapshot,
  HubSpotTask,
} from "./types";

// Demonstration data only. Company, contact and deal names below are entirely
// fictional — they do not represent real Simplyai clients, prospects or deals.
// Pipeline/stage labels mirror what the live HubSpot portal actually uses;
// intermediate (non-closed) stage labels are a reasonable placeholder until
// confirmed against a portal that has open deals in this pipeline.

const PIPELINE_ID = "40955303";
const PIPELINE_LABEL = "Simplyai Pipeline - All Deals";

const STAGES: { id: string; label: string; probability: number | null }[] = [
  { id: "discovery_call", label: "Discovery Call", probability: 0.2 },
  { id: "qualified", label: "Qualified", probability: 0.3 },
  { id: "proposal_sent", label: "Proposal Sent", probability: 0.5 },
  { id: "negotiation", label: "Negotiation", probability: 0.7 },
  { id: "verbal_commitment", label: "Verbal Commitment", probability: 0.85 },
  { id: "86637492", label: "Closed Won", probability: 1 },
  { id: "86655538", label: "Closed Lost", probability: 0 },
];

function stage(label: string) {
  const found = STAGES.find((s) => s.label === label);
  if (!found) throw new Error(`Unknown demo stage: ${label}`);
  return found;
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDateTimeDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

type DealSeed = {
  id: string;
  name: string;
  company: string;
  contact: string;
  stageLabel: string;
  amount: number | null;
  closeDateOffsetDays: number | null;
  createdOffsetDays: number;
  stageEnteredOffsetDays: number | null;
  lastActivityOffsetDays: number | null;
  lastContactedOffsetDays: number | null;
  nextActivityOffsetDays: number | null;
  nextStep: string | null;
  forecastCategory: HubSpotDeal["forecastCategory"];
  strategicallyImportant?: boolean;
  isClosedWon?: boolean;
  isClosedLost?: boolean;
};

const DEAL_SEEDS: DealSeed[] = [
  {
    id: "1001",
    name: "Aurora Health Group – Clinical Data Platform",
    company: "Aurora Health Group",
    contact: "Priya Chandra",
    stageLabel: "Proposal Sent",
    amount: 220000,
    closeDateOffsetDays: 10,
    createdOffsetDays: -38,
    stageEnteredOffsetDays: -6,
    lastActivityOffsetDays: -2,
    lastContactedOffsetDays: -2,
    nextActivityOffsetDays: 3,
    nextStep: "Send revised proposal reflecting the shorter delivery timeline",
    forecastCategory: "best_case",
  },
  {
    id: "1002",
    name: "Bluewater Logistics – Fleet Analytics Rollout",
    company: "Bluewater Logistics",
    contact: "Tom Whitfield",
    stageLabel: "Negotiation",
    amount: 340000,
    closeDateOffsetDays: -5, // overdue
    createdOffsetDays: -70,
    stageEnteredOffsetDays: -22,
    lastActivityOffsetDays: -9,
    lastContactedOffsetDays: -9,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "commit",
    strategicallyImportant: true,
  },
  {
    id: "1003",
    name: "Meridian Financial Services – Agentic Ops Pilot",
    company: "Meridian Financial Services",
    contact: "Sarah Nguyen",
    stageLabel: "Discovery Call",
    amount: 95000,
    closeDateOffsetDays: 45,
    createdOffsetDays: -6,
    stageEnteredOffsetDays: -6,
    lastActivityOffsetDays: 0,
    lastContactedOffsetDays: 0,
    nextActivityOffsetDays: 5,
    nextStep: "Confirm technical scope with CTO",
    forecastCategory: "pipeline",
  },
  {
    id: "1004",
    name: "Northline Retail Co – Demand Forecasting",
    company: "Northline Retail Co",
    contact: "Ben Ahmadi",
    stageLabel: "Qualified",
    amount: 180000,
    closeDateOffsetDays: 12,
    createdOffsetDays: -25,
    stageEnteredOffsetDays: -9,
    lastActivityOffsetDays: -8,
    lastContactedOffsetDays: -8,
    nextActivityOffsetDays: null,
    nextStep: "Loop in the finance stakeholder before proposing",
    forecastCategory: "pipeline",
  },
  {
    id: "1005",
    name: "Southport Council – Data Platform Modernisation",
    company: "Southport Council",
    contact: "Grace Liu",
    stageLabel: "Verbal Commitment",
    amount: 640000,
    closeDateOffsetDays: 6,
    createdOffsetDays: -95,
    stageEnteredOffsetDays: -4,
    lastActivityOffsetDays: -1,
    lastContactedOffsetDays: -1,
    nextActivityOffsetDays: 2,
    nextStep: "Finalise contract redlines with procurement",
    forecastCategory: "commit",
    strategicallyImportant: true,
  },
  {
    id: "1006",
    name: "Delta Minerals – Predictive Maintenance POC",
    company: "Delta Minerals",
    contact: "Jack Osei",
    stageLabel: "Proposal Sent",
    amount: 275000,
    closeDateOffsetDays: 25,
    createdOffsetDays: -40,
    stageEnteredOffsetDays: -16,
    lastActivityOffsetDays: -14,
    lastContactedOffsetDays: -14,
    nextActivityOffsetDays: null,
    nextStep: "Follow up",
    forecastCategory: "best_case",
  },
  {
    id: "1007",
    name: "Harborview Insurance – Claims Automation",
    company: "Harborview Insurance",
    contact: "Elena Marsh",
    stageLabel: "Negotiation",
    amount: 410000,
    closeDateOffsetDays: 12,
    createdOffsetDays: -60,
    stageEnteredOffsetDays: -8,
    lastActivityOffsetDays: -3,
    lastContactedOffsetDays: -3,
    nextActivityOffsetDays: 4,
    nextStep: "Present final commercial terms to the executive sponsor",
    forecastCategory: "commit",
    strategicallyImportant: true,
  },
  {
    id: "1008",
    name: "Kestrel Manufacturing – Supply Chain Copilot",
    company: "Kestrel Manufacturing",
    contact: "None on file",
    stageLabel: "Qualified",
    amount: null, // missing amount
    closeDateOffsetDays: 30,
    createdOffsetDays: -18,
    stageEnteredOffsetDays: -10,
    lastActivityOffsetDays: -4,
    lastContactedOffsetDays: -4,
    nextActivityOffsetDays: 9,
    nextStep: "Scope a pilot with the operations lead",
    forecastCategory: "pipeline",
  },
  {
    id: "1009",
    name: "Wavelength Media – Content Ops Agent",
    company: "Wavelength Media",
    contact: "None on file",
    stageLabel: "Discovery Call",
    amount: 60000,
    closeDateOffsetDays: 60,
    createdOffsetDays: -80,
    stageEnteredOffsetDays: -21,
    lastActivityOffsetDays: -21,
    lastContactedOffsetDays: -21,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "pipeline",
    strategicallyImportant: true,
  },
  {
    id: "1010",
    name: "Ironbark Energy – Grid Data Integration",
    company: "Ironbark Energy",
    contact: "Marcus Webb",
    stageLabel: "Proposal Sent",
    amount: 480000,
    closeDateOffsetDays: -3, // overdue
    createdOffsetDays: -50,
    stageEnteredOffsetDays: -12,
    lastActivityOffsetDays: -6,
    lastContactedOffsetDays: -6,
    nextActivityOffsetDays: null,
    nextStep: "Awaiting legal sign-off",
    forecastCategory: "commit",
  },
  {
    id: "1011",
    name: "Coastal Produce Group – Inventory Intelligence",
    company: "Coastal Produce Group",
    contact: "Amy Fitzgerald",
    stageLabel: "Negotiation",
    amount: 150000,
    closeDateOffsetDays: 15,
    createdOffsetDays: -30,
    stageEnteredOffsetDays: -5,
    lastActivityOffsetDays: 0,
    lastContactedOffsetDays: 0,
    nextActivityOffsetDays: 1,
    nextStep: "Confirm go-live date with operations",
    forecastCategory: "best_case",
  },
  {
    id: "1012",
    name: "Union Freight Co – Route Optimisation Trial",
    company: "Union Freight Co",
    contact: "Diane Okoro",
    stageLabel: "Qualified",
    amount: 210000,
    closeDateOffsetDays: 40,
    createdOffsetDays: -90,
    stageEnteredOffsetDays: -63, // in stage a long time
    lastActivityOffsetDays: -10,
    lastContactedOffsetDays: -10,
    nextActivityOffsetDays: null,
    nextStep: "Reconnect after their board review",
    forecastCategory: "pipeline",
  },
  {
    id: "2001",
    name: "Prosper Housing Trust – Tenant Insights Dashboard",
    company: "Prosper Housing Trust",
    contact: "Lena Ford",
    stageLabel: "Closed Won",
    amount: 185000,
    closeDateOffsetDays: -18,
    createdOffsetDays: -80,
    stageEnteredOffsetDays: -18,
    lastActivityOffsetDays: -18,
    lastContactedOffsetDays: -18,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "closed_won",
    isClosedWon: true,
  },
  {
    id: "2002",
    name: "Northgate Brewing – Ops Reporting Refresh",
    company: "Northgate Brewing",
    contact: "Callum Reid",
    stageLabel: "Closed Won",
    amount: 96000,
    closeDateOffsetDays: -32,
    createdOffsetDays: -95,
    stageEnteredOffsetDays: -32,
    lastActivityOffsetDays: -32,
    lastContactedOffsetDays: -32,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "closed_won",
    isClosedWon: true,
  },
  {
    id: "2003",
    name: "Vantage Legal Partners – Matter Intake Automation",
    company: "Vantage Legal Partners",
    contact: "Nadia Farouk",
    stageLabel: "Closed Won",
    amount: 132000,
    closeDateOffsetDays: -3,
    createdOffsetDays: -55,
    stageEnteredOffsetDays: -3,
    lastActivityOffsetDays: -3,
    lastContactedOffsetDays: -3,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "closed_won",
    isClosedWon: true,
  },
  {
    id: "3001",
    name: "Redline Motors – Service Scheduling Bot",
    company: "Redline Motors",
    contact: "Owen Barrett",
    stageLabel: "Closed Lost",
    amount: 88000,
    closeDateOffsetDays: -14,
    createdOffsetDays: -60,
    stageEnteredOffsetDays: -14,
    lastActivityOffsetDays: -14,
    lastContactedOffsetDays: -14,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "closed_lost",
    isClosedLost: true,
  },
  {
    id: "3002",
    name: "Golden Fields Agribusiness – Yield Forecasting",
    company: "Golden Fields Agribusiness",
    contact: "Ruth Palmer",
    stageLabel: "Closed Lost",
    amount: 145000,
    closeDateOffsetDays: -40,
    createdOffsetDays: -110,
    stageEnteredOffsetDays: -40,
    lastActivityOffsetDays: -40,
    lastContactedOffsetDays: -40,
    nextActivityOffsetDays: null,
    nextStep: null,
    forecastCategory: "closed_lost",
    isClosedLost: true,
  },
];

function buildDeal(seed: DealSeed, ownerId: string, companyId: string, contactId: string | null): HubSpotDeal {
  const s = stage(seed.stageLabel);
  return {
    id: seed.id,
    name: seed.name,
    ownerId,
    companyId,
    companyName: seed.company,
    primaryContactId: contactId,
    primaryContactName: contactId ? seed.contact : null,
    pipeline: PIPELINE_ID,
    pipelineLabel: PIPELINE_LABEL,
    stage: s.id,
    stageLabel: s.label,
    isClosedWon: Boolean(seed.isClosedWon),
    isClosedLost: Boolean(seed.isClosedLost),
    amount: seed.amount,
    currency: "AUD",
    probability: seed.isClosedWon || seed.isClosedLost ? null : s.probability,
    forecastCategory: seed.forecastCategory,
    forecastAmount:
      seed.amount !== null && s.probability !== null && !seed.isClosedWon && !seed.isClosedLost
        ? Math.round(seed.amount * s.probability)
        : null,
    closeDate: seed.closeDateOffsetDays === null ? null : isoDaysFromNow(seed.closeDateOffsetDays),
    createdAt: isoDateTimeDaysFromNow(seed.createdOffsetDays),
    stageEnteredAt: seed.stageEnteredOffsetDays === null ? null : isoDateTimeDaysFromNow(seed.stageEnteredOffsetDays),
    lastActivityAt: seed.lastActivityOffsetDays === null ? null : isoDateTimeDaysFromNow(seed.lastActivityOffsetDays),
    lastContactedAt: seed.lastContactedOffsetDays === null ? null : isoDateTimeDaysFromNow(seed.lastContactedOffsetDays),
    nextActivityAt: seed.nextActivityOffsetDays === null ? null : isoDateTimeDaysFromNow(seed.nextActivityOffsetDays),
    nextStep: seed.nextStep,
    strategicallyImportant: Boolean(seed.strategicallyImportant),
    dealUrl: `https://app.hubspot.com/contacts/demo-portal/deal/${seed.id}`,
  };
}

export class MockHubSpotProvider implements HubSpotProvider {
  readonly providerName = "mock" as const;

  async getSnapshot(options: HubSpotProviderOptions): Promise<HubSpotSnapshot> {
    const ownerId = options.ownerId;
    const owner: HubSpotOwner = {
      ownerId,
      name: "Demo salesperson",
      email: "demo@simplyai.com.au",
      isActive: true,
    };

    const companyNames = Array.from(new Set(DEAL_SEEDS.map((d) => d.company)));
    const companies: HubSpotCompany[] = companyNames.map((name, i) => ({
      id: `co-${i + 1}`,
      name,
      domain: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com`,
      industry: null,
      companyUrl: `https://app.hubspot.com/contacts/demo-portal/company/co-${i + 1}`,
    }));
    const companyIdByName = new Map(companies.map((c) => [c.name, c.id]));

    const contacts: HubSpotContact[] = [];
    const contactIdByName = new Map<string, string>();
    for (const seed of DEAL_SEEDS) {
      if (seed.contact === "None on file") continue;
      if (contactIdByName.has(seed.contact)) continue;
      const id = `ct-${contacts.length + 1}`;
      contactIdByName.set(seed.contact, id);
      contacts.push({
        id,
        fullName: seed.contact,
        email: `${seed.contact.toLowerCase().replace(/[^a-z]+/g, ".")}@${companyIdByName.get(seed.company) ? seed.company.toLowerCase().replace(/[^a-z0-9]+/g, "") : "example"}.example.com`,
        jobTitle: null,
        companyId: companyIdByName.get(seed.company) ?? null,
        isDecisionMaker: null,
        contactUrl: `https://app.hubspot.com/contacts/demo-portal/contact/${id}`,
      });
    }

    const deals = DEAL_SEEDS.map((seed) =>
      buildDeal(seed, ownerId, companyIdByName.get(seed.company) ?? "", seed.contact === "None on file" ? null : contactIdByName.get(seed.contact) ?? null),
    );

    const tasks: HubSpotTask[] = [
      {
        id: "task-1",
        title: "Prep board-ready summary for Southport Council contract review",
        dueAt: isoDateTimeDaysFromNow(0),
        isCompleted: false,
        dealId: "1005",
        taskUrl: "https://app.hubspot.com/contacts/demo-portal/task/task-1",
      },
      {
        id: "task-2",
        title: "Chase signed order form from Harborview Insurance",
        dueAt: isoDateTimeDaysFromNow(1),
        isCompleted: false,
        dealId: "1007",
        taskUrl: "https://app.hubspot.com/contacts/demo-portal/task/task-2",
      },
      {
        id: "task-3",
        title: "Log outcome of last week's Delta Minerals call",
        dueAt: isoDateTimeDaysFromNow(-2),
        isCompleted: false,
        dealId: "1006",
        taskUrl: "https://app.hubspot.com/contacts/demo-portal/task/task-3",
      },
    ];

    const engagements: HubSpotEngagement[] = [
      { id: "eng-1", type: "meeting", occurredAt: isoDateTimeDaysFromNow(-1), dealId: "1005", summary: "Contract redline walkthrough with procurement" },
      { id: "eng-2", type: "call", occurredAt: isoDateTimeDaysFromNow(-2), dealId: "1001", summary: "Discussed revised delivery timeline" },
      { id: "eng-3", type: "email", occurredAt: isoDateTimeDaysFromNow(-3), dealId: "1007", summary: "Sent updated commercial terms" },
      { id: "eng-4", type: "note", occurredAt: isoDateTimeDaysFromNow(-6), dealId: "1010", summary: "Legal review still in progress on their side" },
    ];

    return {
      dataSource: "demo",
      fetchedAt: new Date().toISOString(),
      owner,
      deals,
      contacts,
      companies,
      tasks,
      engagements,
    };
  }
}
