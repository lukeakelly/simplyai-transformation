export type BlockerType =
  | 'silo_cube'
  | 'scope_creep'
  | 'unqualified_gremlin'
  | 'margin_leak'
  | 'tech_debt'
  | 'spreadsheet_swamp'
  | 'broken_handoff'
  | 'hype_cloud'
  | 'tool_sprawl'
  | 'ambiguity_fog'
  | 'red_project'
  | 'ungoverned_agent'
  | 'permission_trap'
  | 'hallucination_haze';

export interface BlockerDef {
  type: BlockerType;
  label: string;
  points: number;         // points when destroyed
  health: number;         // hits to destroy
  speed: number;          // movement speed (0 = static)
  colour: number;
  dangerColour: number;
  size: number;           // radius in pixels
  damage: number;         // points lost on collision
  splits?: boolean;       // splits into smaller pieces on hit
  missionTag?: string;
  hazardEffect?: 'slow' | 'fog' | 'drain' | 'redirect';
}

export const BLOCKERS: BlockerDef[] = [
  {
    type: 'silo_cube',
    label: 'Silo Cube',
    points: 40,
    health: 2,
    speed: 0,
    colour: 0x444466,
    dangerColour: 0x333355,
    size: 28,
    damage: 10,
    missionTag: 'bash_silos',
  },
  {
    type: 'scope_creep',
    label: 'Scope Creep Blob',
    points: 30,
    health: 3,
    speed: 35,
    colour: 0x886644,
    dangerColour: 0xaa7755,
    size: 22,
    damage: 15,
    hazardEffect: 'slow',
  },
  {
    type: 'unqualified_gremlin',
    label: 'Unqualified Lead Gremlin',
    points: 35,
    health: 1,
    speed: 80,
    colour: 0x885544,
    dangerColour: 0xaa6655,
    size: 16,
    damage: 8,
  },
  {
    type: 'margin_leak',
    label: 'Margin Leak',
    points: 45,
    health: 2,
    speed: 40,
    colour: 0xcc3300,
    dangerColour: 0xff4400,
    size: 20,
    damage: 20,
    hazardEffect: 'drain',
  },
  {
    type: 'tech_debt',
    label: 'Technical Debt Block',
    points: 50,
    health: 4,
    speed: 0,
    colour: 0x553333,
    dangerColour: 0x774444,
    size: 30,
    damage: 12,
    missionTag: 'bash_debt',
  },
  {
    type: 'spreadsheet_swamp',
    label: 'Spreadsheet Swamp',
    points: 25,
    health: 1,
    speed: 0,
    colour: 0x228833,
    dangerColour: 0x334422,
    size: 35,
    damage: 5,
    hazardEffect: 'slow',
  },
  {
    type: 'broken_handoff',
    label: 'Broken Handoff',
    points: 60,
    health: 2,
    speed: 25,
    colour: 0x885500,
    dangerColour: 0xaa7700,
    size: 24,
    damage: 10,
    missionTag: 'clear_handoff',
  },
  {
    type: 'hype_cloud',
    label: 'Hype Cloud',
    points: 30,
    health: 1,
    speed: 20,
    colour: 0xcc66ff,
    dangerColour: 0xaa44dd,
    size: 32,
    damage: 5,
    hazardEffect: 'fog',
  },
  {
    type: 'tool_sprawl',
    label: 'Tool Sprawl',
    points: 20,
    health: 1,
    speed: 60,
    colour: 0x556677,
    dangerColour: 0x778899,
    size: 14,
    damage: 8,
    splits: true,
  },
  {
    type: 'ambiguity_fog',
    label: 'Ambiguity Fog',
    points: 25,
    health: 1,
    speed: 15,
    colour: 0x888899,
    dangerColour: 0xaaaaaa,
    size: 36,
    damage: 5,
    hazardEffect: 'fog',
  },
  {
    type: 'red_project',
    label: 'Red Project',
    points: 40,
    health: 2,
    speed: 55,
    colour: 0xff2222,
    dangerColour: 0xff4444,
    size: 20,
    damage: 15,
  },
  {
    type: 'ungoverned_agent',
    label: 'Ungoverned Agent',
    points: 45,
    health: 2,
    speed: 70,
    colour: 0xbb3388,
    dangerColour: 0xdd44aa,
    size: 18,
    damage: 12,
  },
  {
    type: 'hallucination_haze',
    label: 'Hallucination Haze',
    points: 35,
    health: 1,
    speed: 30,
    colour: 0xaa55ff,
    dangerColour: 0xcc77ff,
    size: 28,
    damage: 8,
    hazardEffect: 'fog',
  },
];

export function getBlockerDef(type: BlockerType): BlockerDef {
  return BLOCKERS.find((b) => b.type === type)!;
}
