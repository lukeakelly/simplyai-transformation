export type MissionType =
  | 'collect_sectors'
  | 'four_pillar_chain'
  | 'bash_silos'
  | 'cross_skill'
  | 'protect_margin'
  | 'presales_beacon'
  | 'delivery_health'
  | 'responsible_ai'
  | 'proto_to_offering'
  | 'clear_handoff'
  | 'reach_combo'
  | 'trigger_one_firm'
  | 'collect_clients'
  | 'qualified_opps'
  | 'bash_debt'
  | 'collect_knowledge';

export interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;
  missionTag?: string;
}

export const MISSION_POOL: Omit<Mission, 'progress' | 'completed'>[] = [
  {
    id: 'sectors',
    type: 'collect_sectors',
    title: 'Sector Sweep',
    description: 'Collect 3 different client sectors',
    target: 3,
    reward: 500,
  },
  {
    id: 'pillar_chain',
    type: 'four_pillar_chain',
    title: 'Power the Four Pillars',
    description: 'Complete a 4-pillar chain combo',
    target: 1,
    reward: 750,
  },
  {
    id: 'bash_silos',
    type: 'bash_silos',
    title: 'Bash the Silos',
    description: 'Destroy 5 Silo Cubes',
    target: 5,
    reward: 500,
  },
  {
    id: 'cross_skill',
    type: 'cross_skill',
    title: 'Build the Bench',
    description: 'Collect 4 Cross-Skill Tokens',
    target: 4,
    reward: 500,
  },
  {
    id: 'protect_margin',
    type: 'protect_margin',
    title: 'Protect the Margin',
    description: 'Protect 3 points of margin',
    target: 3,
    reward: 600,
  },
  {
    id: 'delivery_health',
    type: 'delivery_health',
    title: 'Operating Rhythm Restored',
    description: 'Restore Delivery Health to 100%',
    target: 1,
    reward: 500,
  },
  {
    id: 'responsible_ai',
    type: 'responsible_ai',
    title: 'Responsible AI Secured',
    description: 'Collect a Responsible AI Shield',
    target: 1,
    reward: 400,
  },
  {
    id: 'reach_combo',
    type: 'reach_combo',
    title: 'Qualify Before You Multiply',
    description: 'Reach a x6 combo',
    target: 6,
    reward: 600,
  },
  {
    id: 'trigger_one_firm',
    type: 'trigger_one_firm',
    title: 'One Firm Mode',
    description: 'Trigger One Firm Mode',
    target: 1,
    reward: 1000,
  },
  {
    id: 'collect_clients',
    type: 'collect_clients',
    title: 'Raise Client Trust',
    description: 'Collect 5 Client Badges',
    target: 5,
    reward: 500,
  },
  {
    id: 'qualified_opps',
    type: 'qualified_opps',
    title: 'Pipeline Full',
    description: 'Collect 3 Qualified Opportunities',
    target: 3,
    reward: 600,
  },
  {
    id: 'bash_debt',
    type: 'bash_debt',
    title: 'Clear the Tech Debt',
    description: 'Destroy 4 Technical Debt Blocks',
    target: 4,
    reward: 500,
  },
  {
    id: 'collect_knowledge',
    type: 'collect_knowledge',
    title: 'Knowledge Hub Active',
    description: 'Collect 5 Knowledge Orbs',
    target: 5,
    reward: 500,
  },
  {
    id: 'clear_handoff',
    type: 'clear_handoff',
    title: 'Connect the Handoff',
    description: 'Clear 2 Broken Handoffs',
    target: 2,
    reward: 600,
  },
];

export function pickMissions(count = 3): Mission[] {
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((m) => ({
    ...m,
    progress: 0,
    completed: false,
  }));
}
