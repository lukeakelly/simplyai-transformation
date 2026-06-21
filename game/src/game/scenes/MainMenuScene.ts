import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../config';
import { audioManager } from '../../systems/AudioManager';

export class MainMenuScene extends Phaser.Scene {
  private stars: Array<{ x: number; y: number; r: number; speed: number; alpha: number }> = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private audioStarted = false;

  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    // Remove loading overlay
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';

    this.cameras.main.setBackgroundColor('#050f1a');

    // Star field
    this.bgGraphics = this.add.graphics();
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        r: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.05,
        alpha: Math.random() * 0.5 + 0.3,
      });
    }

    // Neon grid lines
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x00d4ff, 0.06);
    for (let x = 0; x <= GAME_WIDTH; x += 80) {
      grid.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 80) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Pillar glow discs
    const pillars = [
      { x: GAME_WIDTH * 0.2, colour: 0x00d4ff },
      { x: GAME_WIDTH * 0.4, colour: 0xff6b35 },
      { x: GAME_WIDTH * 0.6, colour: 0x33ccff },
      { x: GAME_WIDTH * 0.8, colour: 0xff33aa },
    ];
    pillars.forEach(({ x, colour }) => {
      const disc = this.add.graphics();
      disc.fillStyle(colour, 0.04);
      disc.fillCircle(x, GAME_HEIGHT * 0.7, 200);
      disc.fillStyle(colour, 0.06);
      disc.fillCircle(x, GAME_HEIGHT * 0.7, 80);
    });

    // Title
    this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.2, 'SIMPLYAI:', {
      fontSize: '52px',
      fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#003366',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.295, 'BASH THE SILOS!', {
      fontSize: '68px',
      fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#00d4ff',
      stroke: '#003366',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, 'One firm. Six leaders. Infinite transformation energy.', {
      fontSize: '18px',
      fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
      color: '#88ccff',
    }).setOrigin(0.5);

    // Tagline
    const taglines = [
      'Choose your executive.',
      'Build momentum.',
      'Bash blockers.',
      'Win client trust.',
    ];
    let tagY = GAME_HEIGHT * 0.465;
    taglines.forEach((t) => {
      this.add.text(GAME_WIDTH / 2, tagY, t, {
        fontSize: '17px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#66aacc',
      }).setOrigin(0.5);
      tagY += 26;
    });

    // Buttons
    this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT * 0.64, 'Start Transformation', 0x00d4ff, 0x003366, () => {
      this.startAudio();
      this.scene.start('CharacterSelect');
    });

    this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, 'How to Play', 0x0066ff, 0x001133, () => {
      this.startAudio();
      this.showHowToPlay();
    });

    const muteLabel = audioManager.isMuted() ? 'Sound: OFF' : 'Sound: ON';
    const muteBtn = this.makeButton(GAME_WIDTH / 2 - 130, GAME_HEIGHT * 0.80, muteLabel, 0x334455, 0x111122, () => {
      const m = audioManager.toggleMute();
      muteBtn.label?.setText(m ? 'Sound: OFF' : 'Sound: ON');
    });

    this.makeButton(GAME_WIDTH / 2 + 130, GAME_HEIGHT * 0.80, 'Accessibility', 0x334455, 0x111122, () => {
      this.showAccessibility();
    });

    // High score
    const hs = this.getHighScore();
    if (hs > 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.88, `Best Score: ${hs.toLocaleString()}`, {
        fontSize: '15px',
        fontFamily: 'system-ui, Arial, sans-serif',
        color: '#556677',
      }).setOrigin(0.5);
    }

    // Version
    this.add.text(GAME_WIDTH - 10, GAME_HEIGHT - 10, 'v1.0', {
      fontSize: '11px', color: '#223344',
    }).setOrigin(1, 1);

    // Pulse title
    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.02, scaleY: 1.02,
      yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.easeInOut',
    });

    // Floating silo cubes decoration
    this.addDecorations();
  }

  private addDecorations() {
    const siloColours = [0x00d4ff, 0xff6b35, 0x33ccff, 0xff33aa, 0x00cc77, 0xffcc00];
    for (let i = 0; i < 8; i++) {
      const x = 80 + Math.random() * (GAME_WIDTH - 160);
      const y = GAME_HEIGHT * 0.85 + Math.random() * 50;
      const r = 12 + Math.random() * 12;
      const col = siloColours[i % siloColours.length];
      const g = this.add.graphics();
      g.fillStyle(col, 0.15);
      g.fillRect(x - r, y - r, r * 2, r * 2);
      g.lineStyle(1, col, 0.3);
      g.strokeRect(x - r, y - r, r * 2, r * 2);
      this.tweens.add({
        targets: g,
        y: -20,
        duration: 4000 + Math.random() * 3000,
        ease: 'Sine.easeInOut',
        repeat: -1,
        delay: Math.random() * 3000,
        yoyo: false,
        onRepeat: () => {
          g.y = GAME_HEIGHT * 0.9 + Math.random() * 40;
          g.x = 80 + Math.random() * (GAME_WIDTH - 160);
        },
      });
    }
  }

  private startAudio() {
    if (!this.audioStarted) {
      audioManager.init();
      audioManager.startMusic();
      this.audioStarted = true;
    }
  }

  private makeButton(
    x: number, y: number, text: string,
    colour: number, bg: number,
    onClick: () => void,
    width = 220, height = 42,
  ) {
    const g = this.add.graphics();
    const label = this.add.text(x, y, text, {
      fontSize: '16px',
      fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    const drawBtn = (alpha = 1) => {
      g.clear();
      g.fillStyle(bg, alpha);
      g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 6);
      g.lineStyle(2, colour, alpha);
      g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 6);
    };

    drawBtn();

    const zone = this.add.zone(x, y, width, height).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => { drawBtn(0.85); audioManager.playSfx('ui_hover'); });
    zone.on('pointerout', () => drawBtn());
    zone.on('pointerdown', () => {
      audioManager.playSfx('ui_click');
      this.startAudio();
      onClick();
    });

    return { g, label, zone };
  }

  private showHowToPlay() {
    const panel = this.add.graphics();
    panel.fillStyle(0x050f1a, 0.95);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 320, 60, 640, 580, 12);
    panel.lineStyle(2, 0x00d4ff, 0.8);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 320, 60, 640, 580, 12);

    const lines = [
      ['HOW TO PLAY', '26px', '#00d4ff'],
      ['', '14px', '#ffffff'],
      ['MOVE', '16px', '#88ccff'],
      ['WASD or Arrow Keys', '14px', '#cceeee'],
      ['', '12px', '#ffffff'],
      ['BASH / DASH', '16px', '#88ccff'],
      ['Space Bar', '14px', '#cceeee'],
      ['', '12px', '#ffffff'],
      ['SPECIAL ABILITY', '16px', '#88ccff'],
      ['E key (when charged)', '14px', '#cceeee'],
      ['', '12px', '#ffffff'],
      ['PAUSE', '16px', '#88ccff'],
      ['P or Escape', '14px', '#cceeee'],
      ['', '12px', '#ffffff'],
      ['MUTE', '16px', '#88ccff'],
      ['M key', '14px', '#cceeee'],
      ['', '14px', '#ffffff'],
      ['GOAL', '20px', '#ffcc00'],
      ['Bash silos, collect items, build combos,', '14px', '#aaccdd'],
      ['charge your Transformation Meter and', '14px', '#aaccdd'],
      ['trigger One Firm Mode for a score surge!', '14px', '#aaccdd'],
      ['', '12px', '#ffffff'],
      ['Beat the Silo Core boss before time runs out.', '14px', '#ffaa88'],
      ['', '14px', '#ffffff'],
      ['MOBILE: Use the on-screen controls.', '13px', '#667788'],
    ];

    const objects: Phaser.GameObjects.GameObject[] = [panel];
    let ty = 90;
    lines.forEach(([txt, size, col]) => {
      const t = this.add.text(GAME_WIDTH / 2, ty, txt, {
        fontSize: size, fontFamily: 'system-ui, Arial, sans-serif',
        color: col, align: 'center',
      }).setOrigin(0.5, 0);
      objects.push(t);
      ty += parseInt(size) + 4;
    });

    const closeBtn = this.makeButton(GAME_WIDTH / 2, ty + 20, 'Got It!', 0x00d4ff, 0x003366, () => {
      objects.forEach((o) => o.destroy());
      closeBtn.g.destroy();
      closeBtn.label.destroy();
      closeBtn.zone.destroy();
    });
    objects.push(closeBtn.g, closeBtn.label, closeBtn.zone);
  }

  private showAccessibility() {
    const panel = this.add.graphics();
    panel.fillStyle(0x050f1a, 0.96);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 260, 100, 520, 440, 12);
    panel.lineStyle(2, 0x0066ff, 0.8);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 260, 100, 520, 440, 12);

    const objects: Phaser.GameObjects.GameObject[] = [panel];

    const title = this.add.text(GAME_WIDTH / 2, 125, 'ACCESSIBILITY', {
      fontSize: '22px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#00d4ff',
    }).setOrigin(0.5);
    objects.push(title);

    const rcm = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === '1';
    const hc = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === '1';

    const makeToggle = (x: number, y: number, lbl: string, active: boolean, key: string) => {
      const bg = this.add.graphics();
      const col = active ? 0x00d4ff : 0x334455;
      bg.fillStyle(col, 0.3);
      bg.fillRoundedRect(x - 200, y - 18, 400, 36, 6);
      bg.lineStyle(2, col, 0.8);
      bg.strokeRoundedRect(x - 200, y - 18, 400, 36, 6);
      const txt = this.add.text(x - 150, y, lbl, {
        fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif',
        color: '#ccddee',
      }).setOrigin(0, 0.5);
      const status = this.add.text(x + 160, y, active ? 'ON' : 'OFF', {
        fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: 'bold', color: active ? '#00d4ff' : '#556677',
      }).setOrigin(1, 0.5);
      const zone = this.add.zone(x, y, 400, 36).setInteractive({ cursor: 'pointer' });
      let cur = active;
      zone.on('pointerdown', () => {
        cur = !cur;
        try { localStorage.setItem(key, cur ? '1' : '0'); } catch { /* ignore */ }
        const nc = cur ? 0x00d4ff : 0x334455;
        bg.clear();
        bg.fillStyle(nc, 0.3);
        bg.fillRoundedRect(x - 200, y - 18, 400, 36, 6);
        bg.lineStyle(2, nc, 0.8);
        bg.strokeRoundedRect(x - 200, y - 18, 400, 36, 6);
        status.setText(cur ? 'ON' : 'OFF').setColor(cur ? '#00d4ff' : '#556677');
      });
      objects.push(bg, txt, status, zone);
    };

    makeToggle(GAME_WIDTH / 2, 180, 'Reduced Motion', rcm, STORAGE_KEYS.REDUCED_MOTION);
    makeToggle(GAME_WIDTH / 2, 230, 'High Contrast', hc, STORAGE_KEYS.HIGH_CONTRAST);

    // Volume sliders (simplified)
    const volLabel = this.add.text(GAME_WIDTH / 2 - 200, 285, 'Music Volume', {
      fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif', color: '#88aacc',
    });
    const sfxLabel = this.add.text(GAME_WIDTH / 2 - 200, 325, 'SFX Volume', {
      fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif', color: '#88aacc',
    });
    objects.push(volLabel, sfxLabel);

    const closeBtn = this.makeButton(GAME_WIDTH / 2, 490, 'Close', 0x0066ff, 0x001133, () => {
      objects.forEach((o) => o.destroy());
      closeBtn.g.destroy();
      closeBtn.label.destroy();
      closeBtn.zone.destroy();
    });
    objects.push(closeBtn.g, closeBtn.label, closeBtn.zone);
  }

  private getHighScore(): number {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) ?? '0', 10);
    } catch { return 0; }
  }

  update() {
    // Animate stars
    this.bgGraphics.clear();
    this.stars.forEach((s) => {
      s.y -= s.speed;
      if (s.y < 0) s.y = GAME_HEIGHT + 2;
      this.bgGraphics.fillStyle(0xaaccff, s.alpha);
      this.bgGraphics.fillCircle(s.x, s.y, s.r);
    });
  }
}
