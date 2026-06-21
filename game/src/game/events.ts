export const EVENTS = {
  // Score
  SCORE_ADD: 'score:add',
  COMBO_INC: 'combo:inc',
  COMBO_RESET: 'combo:reset',
  MULTIPLIER_SET: 'multiplier:set',

  // Collectibles
  COLLECT: 'collect',
  CLIENT_COLLECTED: 'client:collected',

  // Blockers
  BLOCKER_BASHED: 'blocker:bashed',
  BLOCKER_DESTROYED: 'blocker:destroyed',

  // Abilities
  ABILITY_CHARGED: 'ability:charged',
  ABILITY_ACTIVATE: 'ability:activate',
  ABILITY_END: 'ability:end',

  // Transformation Meter
  TRANSFORM_FILL: 'transform:fill',
  ONE_FIRM_START: 'onefirm:start',
  ONE_FIRM_END: 'onefirm:end',

  // Missions
  MISSION_PROGRESS: 'mission:progress',
  MISSION_COMPLETE: 'mission:complete',

  // Powerups
  POWERUP_COLLECT: 'powerup:collect',
  POWERUP_EXPIRE: 'powerup:expire',

  // Game state
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_OVER: 'game:over',
  SURGE_START: 'surge:start',
  BOSS_SPAWN: 'boss:spawn',
  BOSS_DEFEAT: 'boss:defeat',

  // Health
  DELIVERY_HEALTH_CHANGE: 'delivery:health',
  PLAYER_HIT: 'player:hit',
} as const;

export type EventKey = typeof EVENTS[keyof typeof EVENTS];
