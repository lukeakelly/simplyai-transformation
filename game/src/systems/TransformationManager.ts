import Phaser from 'phaser';
import { EVENTS } from '../game/events';
import { ONE_FIRM_DURATION, ONE_FIRM_MULTIPLIER, ONE_FIRM_METER_REQUIRED } from '../game/config';
import { audioManager } from './AudioManager';
import { ScoreManager } from './ScoreManager';

export class TransformationManager {
  private emitter: Phaser.Events.EventEmitter;
  private score: ScoreManager;
  private oneFirmActive = false;
  private oneFirmTimer: number | null = null;
  private timeRemaining = 0;

  constructor(emitter: Phaser.Events.EventEmitter, score: ScoreManager) {
    this.emitter = emitter;
    this.score = score;
  }

  setTime(t: number) {
    this.timeRemaining = t;
  }

  tryActivate(): boolean {
    if (this.oneFirmActive) return false;
    const state = this.score.getState();
    if (state.transformationMeter < ONE_FIRM_METER_REQUIRED) return false;

    this.oneFirmActive = true;
    this.score.consumeTransformation();
    this.score.setMultiplierBoost(ONE_FIRM_MULTIPLIER);
    this.score.add(1000, 'ONE FIRM MODE!');
    audioManager.setOneFirmMode(true);
    this.emitter.emit(EVENTS.ONE_FIRM_START);

    this.oneFirmTimer = window.setTimeout(() => {
      this.deactivate();
    }, ONE_FIRM_DURATION);

    return true;
  }

  deactivate() {
    if (!this.oneFirmActive) return;
    this.oneFirmActive = false;
    if (this.oneFirmTimer) clearTimeout(this.oneFirmTimer);
    this.oneFirmTimer = null;
    audioManager.setOneFirmMode(false);
    this.emitter.emit(EVENTS.ONE_FIRM_END);
  }

  isActive() { return this.oneFirmActive; }

  destroy() {
    if (this.oneFirmTimer) clearTimeout(this.oneFirmTimer);
  }
}
