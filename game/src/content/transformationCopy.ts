export const BASH_MESSAGES = [
  'Silo successfully persuaded.',
  'That handoff is connected now.',
  'Scope creep contained.',
  'The spreadsheet has been respectfully retired.',
  'Qualified before multiplied.',
  'Margin protected. Wayne approves.',
  'Architecture says yes.',
  'Operating rhythm restored.',
  'Useful innovation detected.',
  'Client trust level: glowing.',
  'Four pillars. One combo.',
  'Ambiguity has left the building.',
  'Decision rights unlocked.',
  'Delivery health improving.',
  'Cross-skill chain activated.',
];

export const COMBO_CALLOUTS: Record<number, string> = {
  3:  'MOMENTUM BUILDING!',
  5:  'SILO SMASHER!',
  8:  'ONE FIRM COMBO!',
  10: 'TRANSFORMATION SURGE!',
  12: 'LEGEND STATUS!',
};

export const SCORE_POPUP_LABELS: Record<string, string> = {
  silo_cube:       'SILO BASHED!',
  client_badge:    '+CLIENT TRUST',
  qualified_opp:   '+QUALIFIED!',
  integration_link:'HANDOFF CONNECTED!',
  margin_leak:     'MARGIN SAVED!',
  responsible_ai:  'RESPONSIBLE AI!',
  cross_skill:     'CROSS-SKILL CHAIN!',
  client_outcome:  '+CLIENT OUTCOME',
  one_firm_token:  'ONE FIRM BOOST!',
};

export const DISTRICT_SIGNS = [
  'ONE FIRM PLAZA',
  'CLIENT VALUE AVENUE',
  'DELIVERY DISTRICT',
  'INNOVATION HUB',
  'CAPABILITY CAMPUS',
  'PIPELINE PARKWAY',
  'RESPONSIBLE AI GATE',
  'KNOWLEDGE HUB',
  'FOUR PILLAR CROSSING',
];

export const ONE_FIRM_MESSAGES = [
  'ONE FIRM MODE!',
  'THE WHOLE TEAM IS HERE!',
  'TRANSFORMATION ALIGNED!',
];

export const VICTORY_MESSAGES = [
  'TRANSFORMATION ALIGNED!',
  'SILOS BUSTED!',
  'ONE FIRM WINS!',
];

export const GRADE_THRESHOLDS: Array<{ min: number; grade: string; message: string }> = [
  { min: 20000, grade: 'Transformation Legend', message: 'Extraordinary. The whole firm is aligned.' },
  { min: 12000, grade: 'One Firm Champion', message: 'Outstanding. The silos are gone.' },
  { min: 7000,  grade: 'Silo Smasher', message: 'Great work. Momentum is building.' },
  { min: 3000,  grade: 'Momentum Builder', message: 'Good start. Keep connecting the pillars.' },
  { min: 0,     grade: 'Transformation Starter', message: 'Every journey starts somewhere.' },
];

export function getGrade(score: number) {
  return GRADE_THRESHOLDS.find((g) => score >= g.min) ?? GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
}

export const MISSION_COMPLETE_MESSAGES = [
  'Mission complete!',
  'One Firm delivers.',
  'Nailed it.',
  'Clear owners, fast delivery.',
];
