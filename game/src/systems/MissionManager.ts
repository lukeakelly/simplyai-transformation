import Phaser from 'phaser';
import { Mission, pickMissions } from '../content/missions';
import { EVENTS } from '../game/events';

export class MissionManager {
  private emitter: Phaser.Events.EventEmitter;
  private missions: Mission[] = [];

  constructor(emitter: Phaser.Events.EventEmitter) {
    this.emitter = emitter;
  }

  init() {
    this.missions = pickMissions(3);
  }

  getMissions() { return this.missions; }

  progress(missionType: string, amount = 1) {
    this.missions.forEach((m) => {
      if (m.completed) return;
      if (m.type === missionType || m.missionTag === missionType) {
        m.progress = Math.min(m.target, m.progress + amount);
        this.emitter.emit(EVENTS.MISSION_PROGRESS, m);
        if (m.progress >= m.target) {
          m.completed = true;
          this.emitter.emit(EVENTS.MISSION_COMPLETE, m);
        }
      }
    });
  }

  progressByTag(tag: string) {
    // map collectible/blocker tags to mission types
    const tagMap: Record<string, string> = {
      bash_silos:     'bash_silos',
      cross_skill:    'cross_skill',
      clear_handoff:  'clear_handoff',
      qualified_opps: 'qualified_opps',
      collect_clients:'collect_clients',
      responsible_ai: 'responsible_ai',
      bash_debt:      'bash_debt',
      collect_knowledge:'collect_knowledge',
    };
    const mtype = tagMap[tag];
    if (mtype) this.progress(mtype);
  }

  progressCombo(comboCount: number) {
    this.missions.forEach((m) => {
      if (m.completed || m.type !== 'reach_combo') return;
      if (comboCount >= m.target) {
        m.progress = m.target;
        m.completed = true;
        this.emitter.emit(EVENTS.MISSION_COMPLETE, m);
      } else {
        m.progress = comboCount;
        this.emitter.emit(EVENTS.MISSION_PROGRESS, m);
      }
    });
  }

  progressOneFirm() {
    this.progress('trigger_one_firm');
  }

  progressSector(sector: string) {
    const sectorSet = new Set<string>();
    sectorSet.add(sector);
    this.missions.forEach((m) => {
      if (m.completed || m.type !== 'collect_sectors') return;
      // track via progress as # unique sectors seen this session
      // We increment by 1 only on new sectors (handled externally)
    });
    // Signal externally tracked
    this.emitter.emit('mission:sector', sector);
  }

  completedCount() {
    return this.missions.filter((m) => m.completed).length;
  }

  totalReward() {
    return this.missions.filter((m) => m.completed).reduce((s, m) => s + m.reward, 0);
  }
}
