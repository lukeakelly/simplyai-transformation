export type Pillar = 'data' | 'agentic' | 'cloud' | 'innovation';

export interface CollectibleDef {
  type: string;
  label: string;
  points: number;
  pillar: Pillar;
  colour: number;
  glowColour: number;
  shape: 'circle' | 'diamond' | 'star' | 'hexagon' | 'square';
  missionTag?: string;
}

export const COLLECTIBLES: CollectibleDef[] = [
  // Data & AI
  { type: 'data_foundation', label: 'Data Foundation', points: 40, pillar: 'data', colour: 0x00d4ff, glowColour: 0x0066ff, shape: 'hexagon' },
  { type: 'insight_orb', label: 'Insight Orb', points: 40, pillar: 'data', colour: 0x44eeff, glowColour: 0x0088cc, shape: 'circle' },
  { type: 'ai_readiness', label: 'AI Readiness Token', points: 25, pillar: 'data', colour: 0x00aaff, glowColour: 0x0044bb, shape: 'diamond', missionTag: 'data' },
  { type: 'responsible_ai', label: 'Responsible AI Shield', points: 75, pillar: 'data', colour: 0x00ffcc, glowColour: 0x009977, shape: 'star', missionTag: 'responsible_ai' },
  { type: 'knowledge_orb', label: 'Knowledge Orb', points: 40, pillar: 'data', colour: 0x55aaff, glowColour: 0x0055cc, shape: 'circle', missionTag: 'collect_knowledge' },

  // Agentic AI
  { type: 'agent_spark', label: 'Agent Spark', points: 25, pillar: 'agentic', colour: 0xff6b35, glowColour: 0xcc3300, shape: 'star' },
  { type: 'human_oversight', label: 'Human Oversight Token', points: 50, pillar: 'agentic', colour: 0xff9944, glowColour: 0xcc6600, shape: 'square' },
  { type: 'workflow_orb', label: 'Workflow Orb', points: 40, pillar: 'agentic', colour: 0xffbb55, glowColour: 0xcc8800, shape: 'circle' },
  { type: 'automation_acc', label: 'Automation Accelerator', points: 60, pillar: 'agentic', colour: 0xff7722, glowColour: 0xcc4400, shape: 'diamond' },

  // Cloud & Infrastructure
  { type: 'cloud_foundation', label: 'Cloud Foundation Token', points: 40, pillar: 'cloud', colour: 0x33ccff, glowColour: 0x0077aa, shape: 'hexagon' },
  { type: 'integration_link', label: 'Integration Link', points: 50, pillar: 'cloud', colour: 0x44ddff, glowColour: 0x0099bb, shape: 'diamond', missionTag: 'clear_handoff' },
  { type: 'security_shield', label: 'Security Shield', points: 60, pillar: 'cloud', colour: 0x66eeff, glowColour: 0x33aacc, shape: 'star' },
  { type: 'resilience_bat', label: 'Resilience Battery', points: 40, pillar: 'cloud', colour: 0x22bbff, glowColour: 0x0066aa, shape: 'square' },

  // Innovation Hub
  { type: 'innovation_spark', label: 'Innovation Spark', points: 25, pillar: 'innovation', colour: 0xff33aa, glowColour: 0xcc0077, shape: 'star' },
  { type: 'pov_prism', label: 'POV Prism', points: 75, pillar: 'innovation', colour: 0xff66cc, glowColour: 0xcc3399, shape: 'diamond' },
  { type: 'reusable_acc', label: 'Reusable Accelerator Cube', points: 60, pillar: 'innovation', colour: 0xff44bb, glowColour: 0xcc1188, shape: 'square' },
  { type: 'market_offering', label: 'Market-Ready Offering', points: 175, pillar: 'innovation', colour: 0xff22aa, glowColour: 0xcc0077, shape: 'hexagon', missionTag: 'proto_to_offering' },

  // Special / Cross-pillar
  { type: 'client_badge', label: 'Client Badge', points: 100, pillar: 'data', colour: 0xffcc00, glowColour: 0xcc8800, shape: 'star', missionTag: 'collect_clients' },
  { type: 'qualified_opp', label: 'Qualified Opportunity', points: 150, pillar: 'data', colour: 0xffaa00, glowColour: 0xcc6600, shape: 'diamond', missionTag: 'qualified_opps' },
  { type: 'client_outcome', label: 'Client Outcome Beacon', points: 200, pillar: 'data', colour: 0xffd700, glowColour: 0xcc9900, shape: 'star' },
  { type: 'capability_card', label: 'Capability Card', points: 50, pillar: 'data', colour: 0x88ff88, glowColour: 0x33aa33, shape: 'square' },
  { type: 'cross_skill', label: 'Cross-Skill Token', points: 60, pillar: 'data', colour: 0x66ff66, glowColour: 0x22aa22, shape: 'diamond', missionTag: 'cross_skill' },
  { type: 'one_firm_token', label: 'One Firm Token', points: 0, pillar: 'data', colour: 0xffffff, glowColour: 0xcccccc, shape: 'star' },
];

export type PowerUpType =
  | 'presales_beacon'
  | 'clear_raci'
  | 'cross_skill_boost'
  | 'knowledge_hub'
  | 'responsible_ai_shield'
  | 'delivery_dashboard'
  | 'client_trust_aura'
  | 'operating_rhythm'
  | 'ai_accelerator'
  | 'one_firm_token';

export interface PowerUpDef {
  type: PowerUpType;
  label: string;
  description: string;
  colour: number;
  duration: number; // ms
}

export const POWER_UPS: PowerUpDef[] = [
  { type: 'presales_beacon', label: 'PRESALES BEACON', description: 'Reveals & upgrades nearby opportunities', colour: 0xffaa00, duration: 8000 },
  { type: 'clear_raci', label: 'CLEAR RACI', description: 'Labels objectives, removes ambiguity fog', colour: 0x00ff99, duration: 6000 },
  { type: 'cross_skill_boost', label: 'CROSS-SKILL BOOST', description: 'Access to secondary executive ability', colour: 0x66ffcc, duration: 5000 },
  { type: 'knowledge_hub', label: 'KNOWLEDGE HUB', description: 'Pulls Capability & Knowledge items to you', colour: 0x55aaff, duration: 7000 },
  { type: 'responsible_ai_shield', label: 'RESPONSIBLE AI SHIELD', description: 'Blocks Agentic AI hazards', colour: 0x00ffcc, duration: 9000 },
  { type: 'delivery_dashboard', label: 'DELIVERY DASHBOARD', description: 'Reveals risks and bonuses on the map', colour: 0x44ddff, duration: 6000 },
  { type: 'client_trust_aura', label: 'CLIENT TRUST AURA', description: 'Client collectibles worth double', colour: 0xffcc00, duration: 7000 },
  { type: 'operating_rhythm', label: 'OPERATING RHYTHM', description: 'Slows hazards, extends combos', colour: 0x00ff77, duration: 8000 },
  { type: 'ai_accelerator', label: 'AI ACCELERATOR', description: 'Faster movement & bash recharge', colour: 0x00d4ff, duration: 6000 },
  { type: 'one_firm_token', label: 'ONE FIRM TOKEN', description: '+25 to Transformation Meter', colour: 0xffffff, duration: 0 },
];
