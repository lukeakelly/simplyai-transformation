export interface ExecutiveAbility {
  name: string;
  description: string;
  duration: number;      // ms
  cooldown: number;      // ms
  chargeRequired: number; // 0-100
}

export interface Executive {
  id: string;
  name: string;
  title: string;
  initials: string;
  colour: number;        // Phaser hex
  accentColour: number;
  motif: string;
  callout: string;
  ability: ExecutiveAbility;
  speed: number;         // relative 0.8–1.2
  bashPower: number;     // relative 0.8–1.2
  comboWindow: number;   // ms
}

export const EXECUTIVES: Executive[] = [
  {
    id: 'jason',
    name: 'Jason',
    title: 'Chief Executive Officer',
    initials: 'JC',
    colour: 0x0066ff,
    accentColour: 0x00d4ff,
    motif: 'compass',
    callout: 'One direction. One team.',
    speed: 1.0,
    bashPower: 1.0,
    comboWindow: 4500,
    ability: {
      name: 'ONE VISION',
      description: 'Strategic pulse reveals routes, pulls pillar energy, freezes combo decay and awards bonus points for variety.',
      duration: 8000,
      cooldown: 20000,
      chargeRequired: 80,
    },
  },
  {
    id: 'kylie',
    name: 'Kylie',
    title: 'Chief Transformation & Revenue Officer',
    initials: 'KL',
    colour: 0xff6b35,
    accentColour: 0xffaa00,
    motif: 'arrow',
    callout: 'Qualify it. Shape it. Win it.',
    speed: 1.05,
    bashPower: 0.9,
    comboWindow: 4000,
    ability: {
      name: 'REVENUE RUSH',
      description: 'Magnetises client badges, upgrades opportunity tokens, doubles pipeline scoring and reveals highest-value targets.',
      duration: 7000,
      cooldown: 18000,
      chargeRequired: 75,
    },
  },
  {
    id: 'luke',
    name: 'Luke',
    title: 'Chief Operating Officer',
    initials: 'LA',
    colour: 0x00cc77,
    accentColour: 0x00ff99,
    motif: 'gears',
    callout: 'Clear owners. Fast decisions.',
    speed: 0.95,
    bashPower: 1.1,
    comboWindow: 5000,
    ability: {
      name: 'OPERATING RHYTHM',
      description: 'Rhythmic shockwave clears blockers, slows hazards, repairs delivery zones and extends the combo window.',
      duration: 9000,
      cooldown: 22000,
      chargeRequired: 70,
    },
  },
  {
    id: 'johan',
    name: 'Johan',
    title: 'Chief Technology Officer',
    initials: 'JV',
    colour: 0x6633ff,
    accentColour: 0x9966ff,
    motif: 'shield',
    callout: 'Secure. Scalable. Supportable.',
    speed: 0.9,
    bashPower: 1.2,
    comboWindow: 4000,
    ability: {
      name: 'ARCHITECTURE SHIELD',
      description: 'Technical assurance shield destroys debt blocks, neutralises security hazards and unlocks AI shortcuts.',
      duration: 10000,
      cooldown: 25000,
      chargeRequired: 85,
    },
  },
  {
    id: 'gina',
    name: 'Gina',
    title: 'Chief Innovation Officer',
    initials: 'GR',
    colour: 0xff33aa,
    accentColour: 0xff99cc,
    motif: 'spark',
    callout: 'Make the idea useful.',
    speed: 1.15,
    bashPower: 0.85,
    comboWindow: 3500,
    ability: {
      name: 'INNOVATION BURST',
      description: 'Converts obstacles into accelerators, spawns POV portals, doubles Innovation points and transforms blockers into offerings.',
      duration: 6000,
      cooldown: 16000,
      chargeRequired: 65,
    },
  },
  {
    id: 'wayne',
    name: 'Wayne',
    title: 'Chief Financial Officer',
    initials: 'WB',
    colour: 0xffcc00,
    accentColour: 0xffe066,
    motif: 'ledger',
    callout: 'Protect the margin.',
    speed: 0.95,
    bashPower: 1.0,
    comboWindow: 4500,
    ability: {
      name: 'MARGIN GUARD',
      description: 'Converts Margin Leakage into value tokens, prevents score deductions, multiplies commercial points and reveals hidden bonuses.',
      duration: 8000,
      cooldown: 20000,
      chargeRequired: 75,
    },
  },
];
