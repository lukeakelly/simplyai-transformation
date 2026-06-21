import Phaser from 'phaser';
import { EVENTS } from '../game/events';
import { STORAGE_KEYS } from '../game/config';
import { audioManager } from './AudioManager';

export interface ScoreState {
  total: number;
  combo: number;
  multiplier: number;
  clientTrust: number;
  qualifiedOpps: number;
  deliveryHealth: number;
  capability: number;
  innovation: number;
  marginProtected: number;
  transformationMeter: number;
  clientsCollected: number;
  silosBusted: number;
  highCombo: number;
  crossPillarCombos: number;
  missionsCompleted: number;
  sectorsCollected: Set<string>;
  pillarChain: Set<string>;
}

export class ScoreManager {
  private emitter: Phaser.Events.EventEmitter;
  private state: ScoreState;
  private comboTimer: number | null = null;
  private comboWindow: number = 4000;
  private comboDecayFrozen = false;

  constructor(emitter: Phaser.Events.EventEmitter) {
    this.emitter = emitter;
    this.state = this.fresh();
  }

  private fresh(): ScoreState {
    return {
      total: 0,
      combo: 0,
      multiplier: 1,
      clientTrust: 0,
      qualifiedOpps: 0,
      deliveryHealth: 100,
      capability: 0,
      innovation: 0,
      marginProtected: 0,
      transformationMeter: 0,
      clientsCollected: 0,
      silosBusted: 0,
      highCombo: 0,
      crossPillarCombos: 0,
      missionsCompleted: 0,
      sectorsCollected: new Set(),
      pillarChain: new Set(),
    };
  }

  reset() {
    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.comboTimer = null;
    this.state = this.fresh();
  }

  getState() { return this.state; }

  add(points: number, label?: string, category?: string) {
    const earned = Math.round(points * this.state.multiplier);
    this.state.total += earned;
    this.emitter.emit(EVENTS.SCORE_ADD, earned, label);

    // Category tracking
    if (category === 'client_badge') {
      this.state.clientTrust += earned;
      this.state.clientsCollected++;
    } else if (category === 'qualified_opp') {
      this.state.qualifiedOpps++;
    } else if (category === 'silo_destroy') {
      this.state.silosBusted++;
    } else if (category === 'capability') {
      this.state.capability += earned;
    } else if (category === 'innovation') {
      this.state.innovation += earned;
    } else if (category === 'margin') {
      this.state.marginProtected += earned;
    }

    return earned;
  }

  incCombo(pillar?: string) {
    this.state.combo++;
    if (this.state.combo > this.state.highCombo) {
      this.state.highCombo = this.state.combo;
    }
    if (pillar) {
      this.state.pillarChain.add(pillar);
      if (this.state.pillarChain.size >= 4) {
        this.state.crossPillarCombos++;
        this.add(750, 'CROSS-PILLAR CHAIN!');
        this.state.pillarChain.clear();
      }
    }

    // Multiplier steps
    const newMult = Math.min(10, 1 + Math.floor(this.state.combo / 5));
    if (newMult !== this.state.multiplier) {
      this.state.multiplier = newMult;
      this.emitter.emit(EVENTS.MULTIPLIER_SET, newMult);
    }

    audioManager.setComboLevel(Math.floor(this.state.combo / 3));
    this.emitter.emit(EVENTS.COMBO_INC, this.state.combo);

    this.resetComboTimer();
  }

  resetComboTimer() {
    if (this.comboDecayFrozen) return;
    if (this.comboTimer) clearTimeout(this.comboTimer);
    this.comboTimer = window.setTimeout(() => {
      this.resetCombo();
    }, this.comboWindow);
  }

  resetCombo() {
    this.state.combo = 0;
    this.state.multiplier = 1;
    this.state.pillarChain.clear();
    audioManager.setComboLevel(0);
    this.emitter.emit(EVENTS.COMBO_RESET);
  }

  setComboWindow(ms: number) {
    this.comboWindow = ms;
  }

  freezeComboDecay(frozen: boolean) {
    this.comboDecayFrozen = frozen;
    if (!frozen) this.resetComboTimer();
  }

  addTransformation(amount: number) {
    this.state.transformationMeter = Math.min(100, this.state.transformationMeter + amount);
    this.emitter.emit(EVENTS.TRANSFORM_FILL, this.state.transformationMeter);
  }

  consumeTransformation() {
    this.state.transformationMeter = 0;
    this.emitter.emit(EVENTS.TRANSFORM_FILL, 0);
  }

  damageDeliveryHealth(amount: number) {
    this.state.deliveryHealth = Math.max(0, this.state.deliveryHealth - amount);
    this.emitter.emit(EVENTS.DELIVERY_HEALTH_CHANGE, this.state.deliveryHealth);
  }

  restoreDeliveryHealth(amount: number) {
    this.state.deliveryHealth = Math.min(100, this.state.deliveryHealth + amount);
    this.emitter.emit(EVENTS.DELIVERY_HEALTH_CHANGE, this.state.deliveryHealth);
  }

  completeMission() {
    this.state.missionsCompleted++;
    this.add(500, 'MISSION COMPLETE!');
  }

  setMultiplierBoost(mult: number) {
    this.state.multiplier = Math.max(this.state.multiplier, mult);
  }

  getHighScore(): number {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) ?? '0', 10);
    } catch { return 0; }
  }

  saveHighScore() {
    try {
      const current = this.getHighScore();
      if (this.state.total > current) {
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(this.state.total));
      }
    } catch { /* ignore */ }
  }
}
