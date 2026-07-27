// Canonical HubSpot domain types consumed by the Sales Command Centre.
// Field names on HubSpotDeal/HubSpotContact/HubSpotCompany are app-level,
// not HubSpot internal property names — see docs/hubspot-sales-integration.md
// for the property mapping a live provider must implement.

export type HubSpotOwner = {
  ownerId: string;
  name: string;
  email: string;
  isActive: boolean;
};

export type ForecastCategory =
  | "commit"
  | "best_case"
  | "pipeline"
  | "omitted"
  | "closed_won"
  | "closed_lost";

export type HubSpotDeal = {
  id: string;
  name: string;
  ownerId: string | null;
  companyId: string | null;
  companyName: string | null;
  primaryContactId: string | null;
  primaryContactName: string | null;
  pipeline: string;
  pipelineLabel: string;
  stage: string;
  stageLabel: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
  /** Whole-currency amount, or null when the amount field is empty in HubSpot. */
  amount: number | null;
  currency: string;
  /** Stage probability, 0-1. Null when the stage has no probability configured. */
  probability: number | null;
  forecastCategory: ForecastCategory | null;
  forecastAmount: number | null;
  /** ISO date (yyyy-mm-dd). Null when the deal has no close date set. */
  closeDate: string | null;
  createdAt: string;
  /** When the deal entered its current stage — used to compute days-in-stage. */
  stageEnteredAt: string | null;
  /** Last logged call/email/meeting/note/task on the deal. */
  lastActivityAt: string | null;
  lastContactedAt: string | null;
  /** Next scheduled activity, if any is booked. */
  nextActivityAt: string | null;
  nextStep: string | null;
  strategicallyImportant: boolean;
  dealUrl: string;
};

export type HubSpotContact = {
  id: string;
  fullName: string;
  email: string | null;
  jobTitle: string | null;
  companyId: string | null;
  /**
   * Whether this contact is known to be a decision-maker. HubSpot has no
   * reliable native signal for this, so it stays null unless a custom
   * property/lifecycle stage is confirmed as authoritative — see assumptions doc.
   */
  isDecisionMaker: boolean | null;
  contactUrl: string;
};

export type HubSpotCompany = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  companyUrl: string;
};

export type HubSpotTask = {
  id: string;
  title: string;
  dueAt: string | null;
  isCompleted: boolean;
  dealId: string | null;
  taskUrl: string;
};

export type HubSpotEngagementType = "call" | "email" | "meeting" | "note";

export type HubSpotEngagement = {
  id: string;
  type: HubSpotEngagementType;
  occurredAt: string;
  dealId: string | null;
  summary: string | null;
};

export type HubSpotSnapshot = {
  dataSource: "demo" | "live";
  fetchedAt: string;
  owner: HubSpotOwner;
  deals: HubSpotDeal[];
  contacts: HubSpotContact[];
  companies: HubSpotCompany[];
  tasks: HubSpotTask[];
  engagements: HubSpotEngagement[];
};
