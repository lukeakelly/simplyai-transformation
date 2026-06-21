export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_DURATION = 180; // seconds (3 minutes)
export const SURGE_START = 30;    // final 30s
export const COMBO_WINDOW_DEFAULT = 4000; // ms
export const COMBO_WINDOW_EXTEND = 2000;  // ms added by power-ups

export const PILLAR_COLOURS = {
  data:       0x00d4ff,
  agentic:    0xff6b35,
  cloud:      0x33ccff,
  innovation: 0xff33aa,
} as const;

export const DISTRICT_COLOURS = {
  data:       { bg: 0x020d1a, accent: 0x00d4ff, ground: 0x041a2e },
  agentic:    { bg: 0x1a0800, accent: 0xff6b35, ground: 0x2a0f00 },
  cloud:      { bg: 0x001a2a, accent: 0x33ccff, ground: 0x002233 },
  innovation: { bg: 0x1a0010, accent: 0xff33aa, ground: 0x2a0022 },
} as const;

export const SCORE_VALUES = {
  ai_spark:            25,
  knowledge_orb:       40,
  capability_card:     50,
  cross_skill_token:   60,
  client_trust_star:   75,
  client_badge:        100,
  qualified_opp:       150,
  market_offering:     175,
  client_outcome:      200,
  silo_destroy:        40,
  mission_complete:    500,
  cross_pillar_chain:  750,
  one_firm_activate:   1000,
  boss_defeat:         2500,
} as const;

export const ONE_FIRM_DURATION = 10000; // ms
export const ONE_FIRM_MULTIPLIER = 3;
export const ONE_FIRM_METER_REQUIRED = 100;

export const PLAYER_BASE_SPEED = 200;
export const PLAYER_DASH_SPEED = 500;
export const PLAYER_DASH_DURATION = 180; // ms
export const PLAYER_DASH_COOLDOWN = 600; // ms
export const PLAYER_ABILITY_COOLDOWN = 20000; // ms (overridden per exec)

export const MAX_DELIVERY_HEALTH = 100;
export const SPAWN_INTERVAL_INITIAL = 2500; // ms
export const SPAWN_INTERVAL_MIN = 900;
export const SPAWN_ACCELERATE_RATE = 15;    // reduce by N ms every 10s

export const STORAGE_KEYS = {
  HIGH_SCORE: 'simplyai_high_score',
  SOUND_MUTE: 'simplyai_mute',
  MUSIC_VOL: 'simplyai_music_vol',
  SFX_VOL: 'simplyai_sfx_vol',
  PREF_EXEC: 'simplyai_pref_exec',
  REDUCED_MOTION: 'simplyai_reduced_motion',
  HIGH_CONTRAST: 'simplyai_high_contrast',
  TUTORIAL_SEEN: 'simplyai_tutorial_seen',
} as const;
