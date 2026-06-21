import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../config';
import { getGrade } from '../../content/transformationCopy';
import { EXECUTIVES } from '../../content/executives';
import { audioManager } from '../../systems/AudioManager';

interface ResultData {
  score: number;
  combo: number;
  clients: number;
  opps: number;
  silos: number;
  crossPillar: number;
  missions: number;
  trust: number;
  margin: number;
  deliveryHealth: number;
  executiveId: string;
  bossDefeated: boolean;
  endless: boolean;
}

export class ResultsScene extends Phaser.Scene {
  private resultData!: ResultData;

  constructor() {
    super({ key: 'Results' });
  }

  init(data: ResultData) {
    this.resultData = data;
  }

  create() {
    this.cameras.main.setBackgroundColor('#050f1a');

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x050f1a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.lineStyle(1, 0x00d4ff, 0.05);
    for (let x = 0; x <= GAME_WIDTH; x += 80) bg.lineBetween(x, 0, x, GAME_HEIGHT);
    for (let y = 0; y <= GAME_HEIGHT; y += 80) bg.lineBetween(0, y, GAME_WIDTH, y);

    const exec = EXECUTIVES.find((e) => e.id === this.resultData.executiveId) ?? EXECUTIVES[0];
    const grade = getGrade(this.resultData.score);
    const hs = this.getHighScore();

    // Header
    this.add.text(GAME_WIDTH / 2, 36, 'TRANSFORMATION COMPLETE!', {
      fontSize: '32px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#00d4ff',
      stroke: '#001122', strokeThickness: 4,
    }).setOrigin(0.5);

    // Executive name
    this.add.text(GAME_WIDTH / 2, 75, `${exec.name} — ${exec.title}`, {
      fontSize: '16px', fontFamily: 'system-ui, Arial, sans-serif',
      color: `#${exec.accentColour.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    // Grade panel
    const gradePanel = this.add.graphics();
    gradePanel.fillStyle(exec.colour, 0.12);
    gradePanel.fillRoundedRect(GAME_WIDTH / 2 - 280, 100, 560, 110, 12);
    gradePanel.lineStyle(2, exec.colour, 0.5);
    gradePanel.strokeRoundedRect(GAME_WIDTH / 2 - 280, 100, 560, 110, 12);

    this.add.text(GAME_WIDTH / 2, 128, grade.grade.toUpperCase(), {
      fontSize: '36px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: `#${exec.accentColour.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 168, grade.message, {
      fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif',
      color: '#aabbcc',
    }).setOrigin(0.5);

    // Score
    this.add.text(GAME_WIDTH / 2 - 180, 228, 'FINAL SCORE', {
      fontSize: '13px', fontFamily: 'system-ui, Arial, sans-serif', color: '#556677',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 - 180, 250, this.resultData.score.toLocaleString(), {
      fontSize: '34px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    const newHs = this.resultData.score >= hs;
    this.add.text(GAME_WIDTH / 2 + 100, 228, newHs ? '★ NEW BEST!' : 'BEST SCORE', {
      fontSize: '13px', fontFamily: 'system-ui, Arial, sans-serif',
      color: newHs ? '#ffcc00' : '#556677',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 100, 250, Math.max(this.resultData.score, hs).toLocaleString(), {
      fontSize: '24px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: newHs ? '#ffcc00' : '#aaaaaa',
    }).setOrigin(0.5);

    // Stats grid
    const stats: Array<[string, string | number, string]> = [
      ['Clients Collected', this.resultData.clients, '#ffcc00'],
      ['Qualified Opportunities', this.resultData.opps, '#ff9933'],
      ['Silos Busted', this.resultData.silos, '#ff6600'],
      ['Highest Combo', `x${this.resultData.combo}`, '#00d4ff'],
      ['Cross-Pillar Combos', this.resultData.crossPillar, '#33ccff'],
      ['Missions Completed', `${this.resultData.missions}/3`, '#00ff99'],
      ['Client Trust', this.resultData.trust.toLocaleString(), '#ffcc00'],
      ['Margin Protected', this.resultData.margin.toLocaleString(), '#ffdd44'],
      ['Boss Defeated', this.resultData.bossDefeated ? 'YES!' : 'Not yet', this.resultData.bossDefeated ? '#00ff77' : '#ff4444'],
    ];

    const cols = 3;
    const colW = 560 / cols;
    const startX = GAME_WIDTH / 2 - 280;
    const startY = 300;

    stats.forEach(([label, value, col], i) => {
      const cx = startX + (i % cols) * colW + colW / 2;
      const cy = startY + Math.floor(i / cols) * 60;

      const statBg = this.add.graphics();
      statBg.fillStyle(0x001122, 0.6);
      statBg.fillRoundedRect(cx - colW / 2 + 4, cy, colW - 8, 50, 6);

      this.add.text(cx, cy + 10, String(label), {
        fontSize: '10px', fontFamily: 'system-ui, Arial, sans-serif', color: '#445566',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 28, String(value), {
        fontSize: '18px', fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: 'bold', color: col,
      }).setOrigin(0.5);
    });

    // Tagline
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 200, '"Transformation is a team sport."', {
      fontSize: '18px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'italic', color: '#334455',
    }).setOrigin(0.5);

    // Buttons
    const btnY = GAME_HEIGHT - 140;
    this.makeButton(GAME_WIDTH / 2 - 280, btnY, 'Play Again', 0x00d4ff, 0x003366, () => {
      this.cameras.main.fadeOut(400, 5, 15, 26);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        audioManager.stopMusic();
        this.scene.start('Game', { executiveId: this.resultData.executiveId });
      });
    });

    this.makeButton(GAME_WIDTH / 2 - 80, btnY, 'Choose Executive', 0x0066ff, 0x001133, () => {
      this.cameras.main.fadeOut(400, 5, 15, 26);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        audioManager.stopMusic();
        this.scene.start('CharacterSelect');
      });
    });

    this.makeButton(GAME_WIDTH / 2 + 130, btnY, 'Main Menu', 0x334455, 0x111122, () => {
      this.cameras.main.fadeOut(400, 5, 15, 26);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        audioManager.stopMusic();
        this.scene.start('MainMenu');
      });
    });

    // Confetti burst
    this.launchConfetti();

    // Fade in
    this.cameras.main.fadeIn(600, 5, 15, 26);

    // Play victory sound
    this.time.delayedCall(700, () => audioManager.playVictory());
  }

  private makeButton(
    x: number, y: number, text: string,
    colour: number, bg: number,
    onClick: () => void,
    width = 190, height = 44,
  ) {
    const g = this.add.graphics();
    g.fillStyle(bg, 0.9);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    g.lineStyle(2, colour, 0.8);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);

    const label = this.add.text(x, y, text, {
      fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, width, height).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(colour, 0.25);
      g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      g.lineStyle(2, colour, 1);
      g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      audioManager.playSfx('ui_hover');
    });
    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(bg, 0.9);
      g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      g.lineStyle(2, colour, 0.8);
      g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    });
    zone.on('pointerdown', () => { audioManager.playSfx('ui_click'); onClick(); });
  }

  private launchConfetti() {
    const colours = [0x00d4ff, 0xffcc00, 0xff33aa, 0x00ff99, 0xff6b35, 0x9966ff];
    for (let i = 0; i < 60; i++) {
      this.time.delayedCall(i * 60, () => {
        const col = colours[Math.floor(Math.random() * colours.length)];
        const x = Math.random() * GAME_WIDTH;
        const y = -20;
        const g = this.add.graphics();
        g.fillStyle(col, 0.8);
        g.fillRect(0, 0, 8, 8);
        g.setPosition(x, y);

        this.tweens.add({
          targets: g,
          x: x + (Math.random() - 0.5) * 200,
          y: GAME_HEIGHT + 20,
          angle: Math.random() * 360,
          alpha: 0,
          duration: 2000 + Math.random() * 1500,
          ease: 'Sine.easeIn',
          onComplete: () => g.destroy(),
        });
      });
    }
  }

  private getHighScore(): number {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) ?? '0', 10);
    } catch { return 0; }
  }
}
