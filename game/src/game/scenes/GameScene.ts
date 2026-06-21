import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT,
  GAME_DURATION, SURGE_START,
  PLAYER_BASE_SPEED, PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN,
  SPAWN_INTERVAL_INITIAL, SPAWN_INTERVAL_MIN, SPAWN_ACCELERATE_RATE,
  ONE_FIRM_DURATION, STORAGE_KEYS,
} from '../config';
import { EVENTS } from '../events';
import { EXECUTIVES, Executive } from '../../content/executives';
import { COLLECTIBLES, CollectibleDef, POWER_UPS } from '../../content/collectibles';
import { BLOCKERS, BlockerDef } from '../../content/blockers';
import { CLIENT_BADGES } from '../../content/clientBadges';
import { BASH_MESSAGES, COMBO_CALLOUTS, SCORE_POPUP_LABELS } from '../../content/transformationCopy';
import { ScoreManager } from '../../systems/ScoreManager';
import { MissionManager } from '../../systems/MissionManager';
import { TransformationManager } from '../../systems/TransformationManager';
import { audioManager } from '../../systems/AudioManager';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  facing: { x: number; y: number };
  walkPhase: number;
  dashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  abilityCharge: number;
  abilityCooldown: number;
  abilityActive: boolean;
  abilityTimer: number;
  invincible: boolean;
  invincibleTimer: number;
  slow: number;
  slowTimer: number;
}

interface GameEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  type: string;
  data: CollectibleDef | BlockerDef | { type: string; label: string; colour: number };
  graphics: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  age: number;
  pillar?: string;
  active: boolean;
}

interface PopupText {
  text: Phaser.GameObjects.Text;
  vy: number;
  life: number;
  maxLife: number;
}

interface AllyExecutive {
  exec: Executive;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  walkPhase: number;
  graphics: Phaser.GameObjects.Graphics;
  active: boolean;
  timer: number;
}

// ─── GameScene ───────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {
  // Core
  private emitter!: Phaser.Events.EventEmitter;
  private scoreManager!: ScoreManager;
  private missionManager!: MissionManager;
  private transformManager!: TransformationManager;

  // Executive
  private executive!: Executive;

  // Player
  private player!: PlayerState;
  private playerGraphics!: Phaser.GameObjects.Graphics;
  private playerLabel!: Phaser.GameObjects.Text;
  private playerTrail: Array<{ x: number; y: number; alpha: number }> = [];
  private cameraTarget!: Phaser.GameObjects.Image;

  // Input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // Entities
  private entities: GameEntity[] = [];
  private entityId = 0;
  private popups: PopupText[] = [];
  private allies: AllyExecutive[] = [];

  // Timers
  private timeLeft = GAME_DURATION;
  private spawnInterval = SPAWN_INTERVAL_INITIAL;
  private spawnTimer = 0;
  private accelerateTimer = 0;
  private surgeActive = false;
  private bossSpawned = false;
  private bossDefeated = false;
  private bossEntity: GameEntity | null = null;
  private oneFirmActive = false;
  private sectorsCollected = new Set<string>();
  private gameOver = false;

  // HUD — drawn in screen space via setScrollFactor(0)
  private hudBg!: Phaser.GameObjects.Graphics;
  private meterBar!: Phaser.GameObjects.Graphics;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private comboDisplay!: Phaser.GameObjects.Text;
  private missionTexts: Phaser.GameObjects.Text[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private powerupDisplay!: Phaser.GameObjects.Text;
  private transformMeterY = 0;
  private abilityMeterY = 0;
  private hudW = 220;

  // Particles
  private activeParticles: Array<{
    g: Phaser.GameObjects.Graphics;
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    colour: number; radius: number;
  }> = [];

  // Screenshake
  private shakeIntensity = 0;
  private shakeDuration = 0;

  // Power-ups
  private activePowerups: Array<{ type: string; timer: number; duration: number }> = [];

  // Touch
  private touchActive = false;
  private touchDir = { x: 0, y: 0 };
  private joystickBase?: Phaser.GameObjects.Graphics;
  private joystickThumb?: Phaser.GameObjects.Graphics;
  private joystickCenter = { x: 0, y: 0 };
  private joystickActive = false;
  private joystickId = -1;

  // Background (world-space)
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // Pause
  private paused = false;
  private pauseOverlay?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: { executiveId?: string }) {
    const id = data?.executiveId ?? localStorage.getItem(STORAGE_KEYS.PREF_EXEC) ?? 'jason';
    this.executive = EXECUTIVES.find((e) => e.id === id) ?? EXECUTIVES[0];
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a1520');
    this.emitter = new Phaser.Events.EventEmitter();
    this.gameOver = false;

    // Systems
    this.scoreManager = new ScoreManager(this.emitter);
    this.missionManager = new MissionManager(this.emitter);
    this.missionManager.init();
    this.transformManager = new TransformationManager(this.emitter, this.scoreManager);

    // World-space background
    this.bgGraphics = this.add.graphics();
    this.drawBackground();

    // Camera setup — follows player across the larger world
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameraTarget = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, '__DEFAULT').setVisible(false);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    // Player graphics (world-space)
    this.playerGraphics = this.add.graphics();
    this.playerGraphics.setDepth(10);
    this.playerLabel = this.add.text(0, 0, this.executive.initials, {
      fontSize: '9px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    // Player state
    this.resetPlayer();

    // HUD (screen-space, scrollFactor 0)
    this.buildHud();

    // Touch controls
    this.buildTouchControls();

    // Input
    this.setupInput();

    // Events
    this.setupEventHandlers();

    // Tutorial
    if (!localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN)) {
      this.showTutorial();
    }

    this.cameras.main.fadeIn(600, 10, 21, 32);
    audioManager.init();
    audioManager.startMusic();
  }

  // ─── Background (world-space) ─────────────────────────────────────────────

  private drawBackground() {
    const g = this.bgGraphics;
    g.clear();

    // Full world fill
    g.fillStyle(0x0a1520, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Four district quadrants
    const districts = [
      { x: 0,           y: 0,              w: WORLD_WIDTH / 2, h: WORLD_HEIGHT / 2, col: 0x00d4ff, bg: 0x030e1c, label: 'DATA & AI DISTRICT' },
      { x: WORLD_WIDTH/2, y: 0,            w: WORLD_WIDTH / 2, h: WORLD_HEIGHT / 2, col: 0xff6b35, bg: 0x130600, label: 'AGENTIC AI DISTRICT' },
      { x: 0,           y: WORLD_HEIGHT/2, w: WORLD_WIDTH / 2, h: WORLD_HEIGHT / 2, col: 0x33ccff, bg: 0x001525, label: 'CLOUD & INFRA DISTRICT' },
      { x: WORLD_WIDTH/2, y: WORLD_HEIGHT/2, w: WORLD_WIDTH/2, h: WORLD_HEIGHT/2, col: 0xff33aa, bg: 0x130010, label: 'INNOVATION HUB' },
    ];

    districts.forEach(({ x, y, w, h, col, bg }) => {
      g.fillStyle(bg, 1);
      g.fillRect(x, y, w, h);

      // Floor tile grid (fine)
      g.lineStyle(1, col, 0.06);
      for (let gx = 0; gx <= w; gx += 80) g.lineBetween(x + gx, y, x + gx, y + h);
      for (let gy = 0; gy <= h; gy += 80) g.lineBetween(x, y + gy, x + w, y + gy);

      // Subtler secondary grid
      g.lineStyle(1, col, 0.03);
      for (let gx = 40; gx < w; gx += 80) g.lineBetween(x + gx, y, x + gx, y + h);
      for (let gy = 40; gy < h; gy += 80) g.lineBetween(x, y + gy, x + w, y + gy);

      // District glow pool in centre
      g.fillStyle(col, 0.03);
      g.fillCircle(x + w / 2, y + h / 2, Math.min(w, h) * 0.38);
      g.fillStyle(col, 0.05);
      g.fillCircle(x + w / 2, y + h / 2, Math.min(w, h) * 0.18);

      // Corner accent dots
      g.fillStyle(col, 0.18);
      const dotPts = [
        [x + 24, y + 24], [x + w - 24, y + 24],
        [x + 24, y + h - 24], [x + w - 24, y + h - 24],
      ];
      dotPts.forEach(([dx, dy]) => g.fillCircle(dx, dy, 4));
    });

    // Dividing lines
    g.lineStyle(2, 0x003355, 0.7);
    g.lineBetween(WORLD_WIDTH / 2, 0, WORLD_WIDTH / 2, WORLD_HEIGHT);
    g.lineBetween(0, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT / 2);

    // Central One Firm Plaza
    const cx = WORLD_WIDTH / 2, cy = WORLD_HEIGHT / 2;
    g.fillStyle(0x091420, 1);
    g.fillCircle(cx, cy, 110);
    g.lineStyle(2, 0x00d4ff, 0.5);
    g.strokeCircle(cx, cy, 110);
    g.lineStyle(1, 0x00d4ff, 0.18);
    g.strokeCircle(cx, cy, 150);
    g.lineStyle(1, 0x00d4ff, 0.08);
    g.strokeCircle(cx, cy, 200);

    // District sign plaques
    this.drawDistrictSign(50, 22, 'DATA & AI DISTRICT', 0x00d4ff);
    this.drawDistrictSign(WORLD_WIDTH / 2 + 50, 22, 'AGENTIC AI DISTRICT', 0xff6b35);
    this.drawDistrictSign(50, WORLD_HEIGHT / 2 + 22, 'CLOUD & INFRA DISTRICT', 0x33ccff);
    this.drawDistrictSign(WORLD_WIDTH / 2 + 50, WORLD_HEIGHT / 2 + 22, 'INNOVATION HUB', 0xff33aa);

    // Additional env signs
    const signs: Array<[number, number, string, number]> = [
      [WORLD_WIDTH * 0.25, WORLD_HEIGHT * 0.25, 'CAPABILITY CAMPUS', 0x00d4ff],
      [WORLD_WIDTH * 0.75, WORLD_HEIGHT * 0.25, 'PIPELINE PARKWAY', 0xff6b35],
      [WORLD_WIDTH * 0.25, WORLD_HEIGHT * 0.75, 'KNOWLEDGE HUB', 0x33ccff],
      [WORLD_WIDTH * 0.75, WORLD_HEIGHT * 0.75, 'INNOVATION LAB', 0xff33aa],
      [cx - 10, cy - 130, 'ONE FIRM PLAZA', 0xffffff],
    ];
    signs.forEach(([sx, sy, lbl, col]) => this.drawDistrictSign(sx, sy, lbl, col));

    // Pillar connectors radiating from plaza
    const pillarAngles = [Math.PI * 1.25, Math.PI * 1.75, Math.PI * 0.25, Math.PI * 0.75];
    const pillarCols = [0x00d4ff, 0xff6b35, 0x33ccff, 0xff33aa];
    pillarAngles.forEach((a, i) => {
      g.lineStyle(2, pillarCols[i], 0.12);
      g.lineBetween(cx, cy, cx + Math.cos(a) * 500, cy + Math.sin(a) * 500);
    });
  }

  private drawDistrictSign(x: number, y: number, text: string, col: number) {
    const g = this.bgGraphics;
    const w = text.length * 7 + 20;
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x, y, w, 18, 3);
    g.lineStyle(1, col, 0.5);
    g.strokeRoundedRect(x, y, w, 18, 3);

    // Text is added as a scene text object (world-space)
    this.add.text(x + w / 2, y + 9, text, {
      fontSize: '9px', fontFamily: 'system-ui, Arial, sans-serif',
      color: `#${col.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5).setDepth(2);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  private resetPlayer() {
    this.player = {
      x: WORLD_WIDTH / 2 + 30,
      y: WORLD_HEIGHT / 2 + 30,
      vx: 0, vy: 0,
      speed: PLAYER_BASE_SPEED * this.executive.speed,
      facing: { x: 0, y: 1 },
      walkPhase: 0,
      dashing: false, dashTimer: 0, dashCooldown: 0,
      abilityCharge: 0, abilityCooldown: 0,
      abilityActive: false, abilityTimer: 0,
      invincible: false, invincibleTimer: 0,
      slow: 0, slowTimer: 0,
    };
    this.playerTrail = [];
  }

  /** Draw a realistic-looking suited person at (x, y) in world space. */
  private drawPerson(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    suitColour: number,
    accentColour: number,
    walkPhase: number,
    moving: boolean,
    scale = 1,
    alpha = 1,
  ) {
    const s = scale;
    const swingL = moving ? Math.sin(walkPhase) * 5 * s : 0;
    const swingA = moving ? Math.sin(walkPhase + Math.PI) * 4 * s : 0;
    const bob    = moving ? Math.abs(Math.sin(walkPhase)) * 1.5 * s : 0;

    const cy = y - bob;   // body bobs slightly

    const darkSuit  = Phaser.Display.Color.IntegerToColor(suitColour).darken(22).color;
    const skinTone  = 0xf5c4a0;
    const shirtCol  = 0xfafafa;

    // ── Shadow ──────────────────────────────────────────────────────────────
    g.fillStyle(0x000000, 0.2 * alpha);
    g.fillEllipse(x, y + 22 * s, 30 * s, 10 * s);

    // ── Left shoe ───────────────────────────────────────────────────────────
    g.fillStyle(0x1a1a1a, alpha);
    g.fillEllipse(x - 5 * s, cy + 20 * s + swingL * 0.6, 10 * s, 5 * s);

    // ── Right shoe ──────────────────────────────────────────────────────────
    g.fillEllipse(x + 5 * s, cy + 20 * s - swingL * 0.6, 10 * s, 5 * s);

    // ── Left leg ────────────────────────────────────────────────────────────
    g.fillStyle(darkSuit, alpha);
    g.fillRoundedRect(x - 9 * s, cy + 6 * s, 7 * s, 14 * s + swingL, 3 * s);

    // ── Right leg ───────────────────────────────────────────────────────────
    g.fillRoundedRect(x + 2 * s, cy + 6 * s, 7 * s, 14 * s - swingL, 3 * s);

    // ── Torso / jacket ──────────────────────────────────────────────────────
    g.fillStyle(suitColour, alpha);
    g.fillRoundedRect(x - 12 * s, cy - 12 * s, 24 * s, 20 * s, 5 * s);

    // ── Shirt & lapels ──────────────────────────────────────────────────────
    g.fillStyle(shirtCol, alpha * 0.95);
    g.fillTriangle(
      x - 3 * s, cy - 12 * s,
      x + 3 * s, cy - 12 * s,
      x, cy - 2 * s,
    );

    // ── Tie ─────────────────────────────────────────────────────────────────
    g.fillStyle(accentColour, alpha);
    g.fillTriangle(
      x - 2 * s, cy - 12 * s,
      x + 2 * s, cy - 12 * s,
      x, cy - 2 * s,
    );
    g.fillRect(x - 1.5 * s, cy - 5 * s, 3 * s, 7 * s);

    // ── Left arm ────────────────────────────────────────────────────────────
    g.fillStyle(suitColour, alpha);
    g.fillRoundedRect(x - 18 * s, cy - 10 * s + swingA, 7 * s, 13 * s, 3 * s);

    // ── Right arm ───────────────────────────────────────────────────────────
    g.fillRoundedRect(x + 11 * s, cy - 10 * s - swingA, 7 * s, 13 * s, 3 * s);

    // ── Hands ───────────────────────────────────────────────────────────────
    g.fillStyle(skinTone, alpha);
    g.fillCircle(x - 14 * s, cy + 3 * s + swingA, 4 * s);
    g.fillCircle(x + 15 * s, cy + 3 * s - swingA, 4 * s);

    // ── Neck ────────────────────────────────────────────────────────────────
    g.fillStyle(skinTone, alpha);
    g.fillRect(x - 3 * s, cy - 18 * s, 6 * s, 7 * s);

    // ── Head ────────────────────────────────────────────────────────────────
    g.fillStyle(skinTone, alpha);
    g.fillCircle(x, cy - 23 * s, 12 * s);

    // ── Hair ────────────────────────────────────────────────────────────────
    const hairCol = Phaser.Display.Color.IntegerToColor(accentColour).darken(10).color;
    g.fillStyle(hairCol, alpha * 0.9);
    // Top half of head = hair cap
    g.fillCircle(x, cy - 25 * s, 11 * s);
    g.fillRect(x - 11 * s, cy - 25 * s, 22 * s, 8 * s);

    // ── Eyes ────────────────────────────────────────────────────────────────
    g.fillStyle(0x222222, alpha * 0.9);
    g.fillCircle(x - 4 * s, cy - 22 * s, 2 * s);
    g.fillCircle(x + 4 * s, cy - 22 * s, 2 * s);

    // ── Mouth ───────────────────────────────────────────────────────────────
    g.lineStyle(1.5 * s, 0x553311, alpha * 0.7);
    g.beginPath();
    g.arc(x, cy - 17 * s, 3 * s, 0, Math.PI, false);
    g.strokePath();
  }

  private drawPlayer() {
    const g = this.playerGraphics;
    g.clear();

    const p = this.player;
    const exec = this.executive;
    const moving = Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10;

    // Invincibility flash
    if (p.invincible && Math.floor(this.time.now / 80) % 2 === 0) {
      this.playerLabel.setVisible(false);
      return;
    }
    this.playerLabel.setVisible(true);

    // Motion trail
    if (!localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION)) {
      this.playerTrail.forEach((t, i) => {
        const a = (i / this.playerTrail.length) * 0.2;
        g.fillStyle(exec.colour, a);
        g.fillCircle(t.x, t.y, 6 * (i / this.playerTrail.length));
      });
    }

    // Ability aura
    if (p.abilityActive) {
      g.fillStyle(exec.accentColour, 0.12);
      g.fillCircle(p.x, p.y, 58);
      g.lineStyle(2, exec.accentColour, 0.45);
      g.strokeCircle(p.x, p.y, 58 + Math.sin(this.time.now * 0.01) * 5);
    }

    // One Firm glow
    if (this.oneFirmActive) {
      const hue = ((this.time.now * 0.0012) % 1) * 360;
      const glowCol = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6).color;
      g.fillStyle(glowCol, 0.1);
      g.fillCircle(p.x, p.y, 48);
    }

    // Dash flash overlay
    if (p.dashing) {
      g.fillStyle(exec.accentColour, 0.35);
      g.fillCircle(p.x, p.y, 28);
    }

    // Draw the person
    this.drawPerson(g, p.x, p.y, exec.colour, exec.accentColour, p.walkPhase, moving);

    // Ability charge ring around character
    if (p.abilityCharge > 0) {
      const pct = p.abilityCharge / 100;
      g.lineStyle(3, exec.accentColour, 0.6 * pct);
      g.strokeCircle(p.x, p.y, 30);
      if (pct >= 1) {
        // Pulsing ready glow
        const pulse = 0.15 + 0.15 * Math.sin(this.time.now * 0.01);
        g.fillStyle(exec.accentColour, pulse);
        g.fillCircle(p.x, p.y, 30);
      }
    }

    // Initials badge
    this.playerLabel.setPosition(p.x, p.y - 40);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupInput() {
    this.keys = this.input.keyboard!.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w:     Phaser.Input.Keyboard.KeyCodes.W,
      a:     Phaser.Input.Keyboard.KeyCodes.A,
      s:     Phaser.Input.Keyboard.KeyCodes.S,
      d:     Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      e:     Phaser.Input.Keyboard.KeyCodes.E,
      p:     Phaser.Input.Keyboard.KeyCodes.P,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
      m:     Phaser.Input.Keyboard.KeyCodes.M,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.keyboard!.on('keydown-P',     () => this.togglePause());
    this.input.keyboard!.on('keydown-ESC',   () => this.togglePause());
    this.input.keyboard!.on('keydown-M',     () => {
      const m = audioManager.toggleMute();
      this.showPopup(this.player.x, this.player.y - 60, m ? 'Muted' : 'Sound ON', '#aabbcc');
    });
    this.input.keyboard!.on('keydown-SPACE', () => this.dash());
    this.input.keyboard!.on('keydown-E',     () => this.activateAbility());
  }

  // ─── Touch controls ───────────────────────────────────────────────────────

  private buildTouchControls() {
    const isMobile = this.sys.game.device.input.touch;
    if (!isMobile) return;
    this.touchActive = true;

    const jcx = 110, jcy = GAME_HEIGHT - 110;
    this.joystickCenter = { x: jcx, y: jcy };

    this.joystickBase = this.add.graphics();
    this.joystickBase.fillStyle(0xffffff, 0.07);
    this.joystickBase.fillCircle(jcx, jcy, 60);
    this.joystickBase.lineStyle(2, 0x00d4ff, 0.22);
    this.joystickBase.strokeCircle(jcx, jcy, 60);
    this.joystickBase.setScrollFactor(0).setDepth(20);

    this.joystickThumb = this.add.graphics();
    this.joystickThumb.fillStyle(0x00d4ff, 0.4);
    this.joystickThumb.fillCircle(0, 0, 24);
    this.joystickThumb.setScrollFactor(0).setDepth(21);

    const bashX = GAME_WIDTH - 110, bashY = GAME_HEIGHT - 110;
    const bashBg = this.add.graphics();
    bashBg.fillStyle(0xff6600, 0.3);
    bashBg.fillCircle(bashX, bashY, 48);
    bashBg.lineStyle(2, 0xff6600, 0.6);
    bashBg.strokeCircle(bashX, bashY, 48);
    bashBg.setScrollFactor(0).setDepth(20);
    this.add.text(bashX, bashY, 'BASH', {
      fontSize: '14px', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', color: '#ff9933',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    const abilX = GAME_WIDTH - 220, abilY = GAME_HEIGHT - 100;
    const abilBg = this.add.graphics();
    abilBg.fillStyle(this.executive.colour, 0.3);
    abilBg.fillCircle(abilX, abilY, 40);
    abilBg.lineStyle(2, this.executive.colour, 0.6);
    abilBg.strokeCircle(abilX, abilY, 40);
    abilBg.setScrollFactor(0).setDepth(20);
    this.add.text(abilX, abilY, 'POWER', {
      fontSize: '11px', fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(21);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const dx = ptr.x - jcx, dy = ptr.y - jcy;
      if (Math.sqrt(dx * dx + dy * dy) < 90) {
        this.joystickId = ptr.id;
        this.joystickActive = true;
      }
      if (Math.abs(ptr.x - bashX) < 60 && Math.abs(ptr.y - bashY) < 60) this.dash();
      if (Math.abs(ptr.x - abilX) < 50 && Math.abs(ptr.y - abilY) < 50) this.activateAbility();
    });
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.joystickActive && ptr.id === this.joystickId) {
        const dx = ptr.x - jcx, dy = ptr.y - jcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = 50;
        const nx = dist > maxR ? (dx / dist) * maxR : dx;
        const ny = dist > maxR ? (dy / dist) * maxR : dy;
        this.touchDir = { x: dx / Math.max(1, dist), y: dy / Math.max(1, dist) };
        this.joystickThumb?.setPosition(jcx + nx, jcy + ny);
      }
    });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.id === this.joystickId) {
        this.joystickActive = false;
        this.joystickId = -1;
        this.touchDir = { x: 0, y: 0 };
        this.joystickThumb?.setPosition(jcx, jcy);
      }
    });
  }

  // ─── HUD (screen-space) ───────────────────────────────────────────────────

  private buildHud() {
    const hudX = GAME_WIDTH - this.hudW;

    this.hudBg = this.add.graphics();
    this.hudBg.fillStyle(0x060f1a, 0.9);
    this.hudBg.fillRect(hudX, 0, this.hudW, GAME_HEIGHT);
    this.hudBg.lineStyle(1, 0x00d4ff, 0.22);
    this.hudBg.lineBetween(hudX, 0, hudX, GAME_HEIGHT);
    this.hudBg.setScrollFactor(0).setDepth(30);

    this.meterBar = this.add.graphics();
    this.meterBar.setScrollFactor(0).setDepth(31);

    const lx = hudX + 12, vx = GAME_WIDTH - 12;
    let ry = 16;

    const txt = (x: number, y: number, s: string, col: string, size = '11px', bold = false) => {
      const t = this.add.text(x, y, s, {
        fontSize: size, fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: bold ? 'bold' : 'normal', color: col,
      }).setScrollFactor(0).setDepth(32);
      return t;
    };

    const accentHex = `#${this.executive.accentColour.toString(16).padStart(6, '0')}`;
    txt(lx, ry, this.executive.name.toUpperCase(), accentHex, '13px', true);
    ry += 18;
    txt(lx, ry, this.executive.title, '#334455', '9px');
    ry += 22;

    const div = (y: number) => {
      const d = this.add.graphics();
      d.lineStyle(1, 0x003366, 0.5);
      d.lineBetween(lx, y, GAME_WIDTH - 12, y);
      d.setScrollFactor(0).setDepth(31);
    };

    div(ry); ry += 8;

    txt(lx, ry, 'SCORE', '#445566');
    this.hudTexts.score = txt(vx, ry, '0', '#ffffff', '20px', true).setOrigin(1, 0);
    ry += 28;
    txt(lx, ry, 'COMBO', '#445566');
    this.comboDisplay = txt(vx, ry, 'x1  0 HIT', '#00d4ff', '15px', true).setOrigin(1, 0);
    ry += 26;
    div(ry); ry += 8;

    const stats: Array<[string, string, string]> = [
      ['CLIENT TRUST',     'trust',      '#ffcc00'],
      ['QUALIFIED OPPS',   'opps',       '#ff9933'],
      ['DELIVERY HEALTH',  'health',     '#00cc77'],
      ['CAPABILITY',       'capability', '#55aaff'],
      ['INNOVATION',       'innovation', '#ff33aa'],
      ['MARGIN PROTECTED', 'margin',     '#ffcc00'],
    ];
    stats.forEach(([lbl, key, col]) => {
      txt(lx, ry, lbl, '#334455', '10px');
      this.hudTexts[key] = txt(vx, ry, '0', col, '13px', true).setOrigin(1, 0);
      ry += 20;
    });

    div(ry); ry += 8;

    txt(lx, ry, 'TRANSFORMATION', '#445566', '10px');
    ry += 14;
    this.transformMeterY = ry;
    this.drawMeter(hudX + 12, ry, this.hudW - 24, 12, 0, 0x00d4ff);
    ry += 20;

    txt(lx, ry, this.executive.ability.name, '#223344', '9px');
    ry += 12;
    this.abilityMeterY = ry;
    this.drawMeter(hudX + 12, ry, this.hudW - 24, 8, 0, this.executive.colour);
    ry += 16;

    div(ry); ry += 8;

    txt(lx, ry, 'MISSIONS', '#445566', '10px');
    ry += 14;

    this.missionManager.getMissions().forEach((m, i) => {
      const mt = txt(lx, ry + i * 30, m.title, '#334455', '10px');
      const mp = txt(lx, ry + i * 30 + 13, `${m.progress}/${m.target}`, '#556677', '11px', true);
      this.missionTexts.push(mt, mp);
    });
    ry += this.missionManager.getMissions().length * 30 + 8;

    // Timer (top-centre, fixed to screen)
    this.timerText = this.add.text(GAME_WIDTH / 2 - this.hudW / 2, 14, '3:00', {
      fontSize: '32px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      stroke: '#001122', strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(32);

    this.powerupDisplay = this.add.text(GAME_WIDTH / 2 - this.hudW / 2, GAME_HEIGHT - 54, '', {
      fontSize: '12px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#00ff99',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(32);

    void ry;
  }

  private drawMeter(x: number, y: number, w: number, h: number, pct: number, colour: number) {
    this.meterBar.fillStyle(0x0d1e2e, 1);
    this.meterBar.fillRoundedRect(x, y, w, h, 3);
    if (pct > 0) {
      this.meterBar.fillStyle(colour, 0.85);
      this.meterBar.fillRoundedRect(x, y, Math.max(0, w * pct), h, 3);
    }
  }

  private updateHud() {
    const state = this.scoreManager.getState();
    this.hudTexts.score?.setText(state.total.toLocaleString());

    const comboPct = Math.min(1, state.combo / 12);
    const comboCol = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x00d4ff),
      Phaser.Display.Color.ValueToColor(0xff6600),
      100, Math.round(comboPct * 100),
    );
    const ch = (n: number) => n.toString(16).padStart(2, '0');
    this.comboDisplay?.setText(`x${state.multiplier}  ${state.combo} HIT`)
      .setColor(`#${ch(comboCol.r)}${ch(comboCol.g)}${ch(comboCol.b)}`);

    this.hudTexts.trust?.setText(state.clientTrust.toLocaleString());
    this.hudTexts.opps?.setText(String(state.qualifiedOpps));
    this.hudTexts.health?.setText(`${Math.round(state.deliveryHealth)}%`);
    this.hudTexts.capability?.setText(state.capability.toLocaleString());
    this.hudTexts.innovation?.setText(state.innovation.toLocaleString());
    this.hudTexts.margin?.setText(state.marginProtected.toLocaleString());

    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
    this.timerText.setColor(
      this.timeLeft <= SURGE_START ? '#ff4400' :
      this.timeLeft <= 60 ? '#ffaa00' : '#ffffff',
    );

    this.meterBar.clear();
    const hudX = GAME_WIDTH - this.hudW;
    this.drawMeter(hudX + 12, this.transformMeterY, this.hudW - 24, 12, state.transformationMeter / 100, 0x00d4ff);
    this.drawMeter(hudX + 12, this.abilityMeterY,   this.hudW - 24, 8,  this.player.abilityCharge / 100, this.executive.colour);

    this.missionManager.getMissions().forEach((m, i) => {
      const base = i * 2;
      const col = m.completed ? '#00ff77' : '#334455';
      this.missionTexts[base]?.setColor(col).setText((m.completed ? '✓ ' : '') + m.title);
      this.missionTexts[base + 1]?.setText(m.completed ? 'Complete!' : `${m.progress}/${m.target}`)
        .setColor(m.completed ? '#00ff77' : '#556677');
    });
  }

  // ─── Popups (world-space) ─────────────────────────────────────────────────

  private showPopup(x: number, y: number, text: string, colour = '#ffffff', size = '15px') {
    const t = this.add.text(x, y, text, {
      fontSize: size, fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: colour,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);
    this.popups.push({ text: t, vy: -55, life: 1.2, maxLife: 1.2 });
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.text.y += p.vy * dt;
      p.vy *= 0.94;
      p.text.setAlpha(Math.max(0, p.life / p.maxLife));
      if (p.life <= 0) { p.text.destroy(); this.popups.splice(i, 1); }
    }
  }

  // ─── Particles ────────────────────────────────────────────────────────────

  private spawnParticles(x: number, y: number, count: number, colour: number, speed = 150) {
    if (localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === '1') return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      const g = this.add.graphics().setDepth(20);
      const r = 2 + Math.random() * 3;
      g.fillStyle(colour, 1);
      g.fillCircle(0, 0, r);
      g.setPosition(x, y);
      this.activeParticles.push({
        g, x, y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8, colour, radius: r,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 80 * dt; p.vx *= 0.96;
      p.g.setPosition(p.x, p.y).setAlpha(Math.max(0, p.life / p.maxLife));
      if (p.life <= 0) { p.g.destroy(); this.activeParticles.splice(i, 1); }
    }
  }

  // ─── Entities ─────────────────────────────────────────────────────────────

  private spawnCollectible(type?: string) {
    const pool = COLLECTIBLES.filter((c) => c.type !== 'one_firm_token' || Math.random() < 0.05);
    const def = type
      ? pool.find((c) => c.type === type) ?? pool[Math.floor(Math.random() * pool.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    const { x, y } = this.randomWorldPos(50);
    this.addEntity('collectible', x, y, def);
  }

  private spawnBlocker(type?: string) {
    const basic = ['silo_cube', 'scope_creep', 'tech_debt', 'ambiguity_fog', 'hype_cloud', 'tool_sprawl'];
    const pick = type ?? basic[Math.floor(Math.random() * basic.length)];
    const def = BLOCKERS.find((b) => b.type === pick) ?? BLOCKERS[0];
    const { x, y } = this.randomWorldPos(60);
    this.addEntity('blocker', x, y, def);
  }

  private spawnPowerup() {
    const def = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
    const { x, y } = this.randomWorldPos(80);
    this.addEntity('powerup', x, y, { type: def.type, label: def.label, colour: def.colour });
  }

  private spawnClientBadge() {
    const badge = CLIENT_BADGES[Math.floor(Math.random() * CLIENT_BADGES.length)];
    const { x, y } = this.randomWorldPos(80);
    this.addEntity('client', x, y, { type: 'client_badge', label: badge.label, colour: badge.colour, sector: badge.sector } as any);
  }

  private randomWorldPos(margin = 60): { x: number; y: number } {
    const hudLeft = WORLD_WIDTH - 80; // keep away from right edge
    return {
      x: margin + Math.random() * (hudLeft - margin * 2),
      y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
    };
  }

  private addEntity(
    category: 'collectible' | 'blocker' | 'powerup' | 'client' | 'boss',
    x: number, y: number,
    data: CollectibleDef | BlockerDef | { type: string; label: string; colour: number },
  ): GameEntity {
    const g = this.add.graphics().setDepth(6);
    const bd = data as BlockerDef;
    const cd = data as CollectibleDef;

    const radius = category === 'blocker' ? (bd.size ?? 20)
                 : category === 'boss'    ? 60
                 : category === 'client'  ? 18
                 : category === 'powerup' ? 16
                 : 14;
    const hp = category === 'blocker' ? (bd.health ?? 1)
             : category === 'boss'    ? 20
             : 1;

    let vx = 0, vy = 0;
    if (category === 'blocker' && bd.speed > 0) {
      const a = Math.random() * Math.PI * 2;
      vx = Math.cos(a) * bd.speed;
      vy = Math.sin(a) * bd.speed;
    }

    const entity: GameEntity = {
      id: this.entityId++, x, y, vx, vy, radius,
      hp, maxHp: hp, type: category, data, graphics: g,
      age: 0, pillar: cd.pillar, active: true,
    };
    this.entities.push(entity);
    this.drawEntity(entity);
    return entity;
  }

  private drawEntity(e: GameEntity) {
    const g = e.graphics;
    g.clear();
    if (!e.active) { g.setVisible(false); return; }

    const d = e.data as any;
    const colour = d.colour ?? 0xffffff;
    const r = e.radius;
    const pulse = 1 + Math.sin(e.age * 3) * 0.06;

    if (e.type === 'boss') { this.drawBoss(g, e); return; }

    if (e.type === 'blocker') {
      const bd = e.data as BlockerDef;
      const hpPct = e.hp / e.maxHp;
      // Draw as an ominous cube
      g.fillStyle(colour, 0.9);
      const s = r * 1.8 * pulse;
      g.fillRect(e.x - s / 2, e.y - s / 2, s, s);
      g.lineStyle(2, bd.dangerColour, 0.9);
      g.strokeRect(e.x - s / 2, e.y - s / 2, s, s);
      // Cross hatch detail
      g.lineStyle(1, bd.dangerColour, 0.3);
      g.lineBetween(e.x - s / 2, e.y - s / 2, e.x + s / 2, e.y + s / 2);
      g.lineBetween(e.x + s / 2, e.y - s / 2, e.x - s / 2, e.y + s / 2);
      // HP bar
      if (e.maxHp > 1) {
        g.fillStyle(0x111111, 1);
        g.fillRect(e.x - r, e.y - r - 10, r * 2, 5);
        g.fillStyle(0xff4444, 1);
        g.fillRect(e.x - r, e.y - r - 10, r * 2 * hpPct, 5);
      }
      // Label
      if (!e.label) {
        e.label = this.add.text(e.x, e.y + r + 8, bd.label, {
          fontSize: '9px', fontFamily: 'system-ui, Arial, sans-serif', color: '#ff6644',
        }).setOrigin(0.5).setDepth(7);
      }
      e.label.setPosition(e.x, e.y + r + 8);
      return;
    }

    if (e.type === 'powerup') {
      g.fillStyle(colour, 0.15);
      g.fillCircle(e.x, e.y, r * 2.2 * pulse);
      g.lineStyle(2, colour, 0.8);
      g.strokeCircle(e.x, e.y, r * pulse);
      g.fillStyle(colour, 0.9);
      g.fillCircle(e.x, e.y, r * 0.55 * pulse);
      if (!e.label) {
        e.label = this.add.text(e.x, e.y + r + 10, (e.data as any).label, {
          fontSize: '9px', fontFamily: 'system-ui, Arial, sans-serif', color: `#${colour.toString(16).padStart(6,'0')}`,
        }).setOrigin(0.5).setDepth(7);
      }
      e.label.setPosition(e.x, e.y + r + 10);
      return;
    }

    if (e.type === 'client') {
      const cd = e.data as any;
      // Draw as a floating identity badge
      g.fillStyle(cd.colour ?? 0x1144aa, 0.9);
      g.fillRoundedRect(e.x - r, e.y - r, r * 2, r * 2, 4);
      g.lineStyle(2, 0xffffff, 0.3);
      g.strokeRoundedRect(e.x - r, e.y - r, r * 2, r * 2, 4);
      // Shine
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(e.x - r + 2, e.y - r + 2, r * 2 - 4, 4);
      if (!e.label) {
        e.label = this.add.text(e.x, e.y + r + 8, cd.label, {
          fontSize: '9px', fontFamily: 'system-ui, Arial, sans-serif', color: '#ffcc88',
        }).setOrigin(0.5).setDepth(7);
      }
      e.label.setPosition(e.x, e.y + r + 8);
      return;
    }

    // Collectible
    const cd = e.data as CollectibleDef;
    const shape = cd.shape ?? 'circle';

    // Outer glow
    g.fillStyle(cd.glowColour ?? colour, 0.1);
    g.fillCircle(e.x, e.y, r * 2.5);
    g.fillStyle(colour, 0.95);

    switch (shape) {
      case 'circle':
        g.fillCircle(e.x, e.y, r * pulse);
        g.lineStyle(1, 0xffffff, 0.25);
        g.strokeCircle(e.x, e.y, r * pulse);
        break;
      case 'diamond':
        g.beginPath();
        g.moveTo(e.x, e.y - r * pulse);
        g.lineTo(e.x + r * pulse, e.y);
        g.lineTo(e.x, e.y + r * pulse);
        g.lineTo(e.x - r * pulse, e.y);
        g.closePath();
        g.fillPath();
        break;
      case 'star': {
        const pts: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 === 0 ? r * pulse : r * 0.42 * pulse;
          pts.push(new Phaser.Geom.Point(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr));
        }
        g.fillPoints(pts, true);
        break;
      }
      case 'hexagon': {
        const pts: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          pts.push(new Phaser.Geom.Point(e.x + Math.cos(a) * r * 0.9 * pulse, e.y + Math.sin(a) * r * 0.9 * pulse));
        }
        g.fillPoints(pts, true);
        break;
      }
      case 'square': {
        const s = r * 1.6 * pulse;
        g.fillRect(e.x - s / 2, e.y - s / 2, s, s);
        break;
      }
    }
  }

  private drawBoss(g: Phaser.GameObjects.Graphics, e: GameEntity) {
    const r = e.radius;
    const hpPct = e.hp / e.maxHp;
    const pulse = 1 + Math.sin(e.age * 2) * 0.04;
    const faceCols = [0x00d4ff, 0xff6b35, 0x33ccff, 0xff33aa];

    for (let i = 0; i < 4; i++) {
      const qx = (i % 2 === 0 ? -1 : 0), qy = (i < 2 ? -1 : 0);
      g.fillStyle(faceCols[i], 0.85);
      g.fillRect(e.x + qx * r * pulse, e.y + qy * r * pulse, r * pulse, r * pulse);
      g.lineStyle(2, 0x000000, 0.4);
      g.strokeRect(e.x + qx * r * pulse, e.y + qy * r * pulse, r * pulse, r * pulse);
    }
    g.fillStyle(0xffffff, 0.2 * hpPct);
    g.fillCircle(e.x, e.y, r * 0.28 * pulse);
    g.lineStyle(3, 0xffffff, 0.65 * hpPct);
    g.strokeCircle(e.x, e.y, r * 0.28 * pulse);

    // HP bar (floated above)
    const barW = r * 2.8;
    g.fillStyle(0x111111, 1);
    g.fillRect(e.x - barW / 2, e.y - r * 1.45, barW, 9);
    g.fillStyle(hpPct > 0.5 ? 0x00ff44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222, 1);
    g.fillRect(e.x - barW / 2, e.y - r * 1.45, barW * hpPct, 9);

    if (!e.label) {
      e.label = this.add.text(e.x, e.y - r * 1.7, 'SILO CORE', {
        fontSize: '12px', fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: 'bold', color: '#ff4400',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(7);
    }
    e.label.setPosition(e.x, e.y - r * 1.7);
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  private checkCollisions() {
    const p = this.player;
    const bashR = p.dashing ? 40 : 18;
    const magnetR = this.oneFirmActive ? 130
                  : this.hasPowerup('knowledge_hub') ? 110
                  : this.hasPowerup('presales_beacon') ? 90 : 0;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) continue;

      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (magnetR > 0 && (e.type === 'collectible' || e.type === 'client') && dist < magnetR) {
        const spd = 200;
        e.x += (dx / Math.max(1, dist)) * spd * 0.016;
        e.y += (dy / Math.max(1, dist)) * spd * 0.016;
      }

      if (dist < bashR + e.radius) {
        if      (e.type === 'collectible')                         this.collectItem(e);
        else if (e.type === 'client')                              this.collectClient(e);
        else if (e.type === 'powerup')                             this.collectPowerup(e);
        else if (e.type === 'blocker' && (p.dashing || p.abilityActive)) this.hitBlocker(e);
        else if (e.type === 'blocker' && !p.invincible)            this.playerHitByBlocker(e);
        else if (e.type === 'boss'    && (p.dashing || p.abilityActive)) this.hitBoss(e);
        else if (e.type === 'boss'    && !p.invincible)            this.playerHitByBlocker(e);
      }
    }
  }

  private collectItem(e: GameEntity) {
    const def = e.data as CollectibleDef;
    let points = def.points;
    if (this.hasPowerup('client_trust_aura') && ['client_badge','qualified_opp','client_outcome'].includes(def.type)) points *= 2;
    if (this.oneFirmActive) points = Math.round(points * 1.5);
    if (this.executive.id === 'kylie' && this.player.abilityActive && ['client_badge','qualified_opp'].includes(def.type)) points *= 2;
    if (this.executive.id === 'gina'  && this.player.abilityActive && ['innovation_spark','pov_prism'].includes(def.type)) points *= 2;

    const label = SCORE_POPUP_LABELS[def.type] ?? `+${points}`;
    this.scoreManager.add(points, label, def.type);
    this.scoreManager.incCombo(def.pillar);
    this.scoreManager.addTransformation(3 + Math.floor(points / 40));

    if (def.type === 'capability_card' || def.type === 'cross_skill') this.scoreManager.getState().capability += points;
    if (['innovation_spark','pov_prism','reusable_acc','market_offering'].includes(def.type)) this.scoreManager.getState().innovation += points;
    if (def.missionTag) this.missionManager.progressByTag(def.missionTag);
    if (def.type === 'one_firm_token') this.scoreManager.addTransformation(25);

    this.showPopup(e.x, e.y - 24, `+${points}`, `#${def.colour.toString(16).padStart(6,'0')}`, '14px');
    this.spawnParticles(e.x, e.y, 8, def.colour);
    audioManager.playSfx('collect');

    const combo = this.scoreManager.getState().combo;
    const callout = COMBO_CALLOUTS[combo];
    if (callout) {
      this.showPopup(e.x, e.y - 50, callout, '#ffcc00', '18px');
      audioManager.playSfx('combo');
    }
    this.missionManager.progressCombo(combo);
    this.removeEntity(e);
  }

  private collectClient(e: GameEntity) {
    const d = e.data as any;
    let points = this.hasPowerup('client_trust_aura') ? 200 : 100;
    if (this.oneFirmActive) points = Math.round(points * 1.5);

    this.scoreManager.add(points, '+CLIENT BADGE!', 'client_badge');
    this.scoreManager.incCombo('data');
    this.scoreManager.addTransformation(8);
    this.missionManager.progressByTag('collect_clients');

    const sector = d.sector ?? 'generic';
    if (!this.sectorsCollected.has(sector)) {
      this.sectorsCollected.add(sector);
      this.missionManager.progress('collect_sectors');
    }
    this.showPopup(e.x, e.y - 24, `+${points} CLIENT TRUST`, '#ffcc00', '15px');
    this.spawnParticles(e.x, e.y, 12, 0xffcc00, 180);
    audioManager.playSfx('client');
    this.removeEntity(e);
  }

  private collectPowerup(e: GameEntity) {
    const d = e.data as { type: string; label: string; colour: number };
    const puDef = POWER_UPS.find((p) => p.type === d.type);
    if (d.type === 'one_firm_token') {
      this.scoreManager.addTransformation(25);
      this.showPopup(e.x, e.y - 24, 'ONE FIRM BOOST! +25', '#ffffff', '15px');
    } else if (puDef) {
      this.activePowerups.push({ type: d.type, timer: puDef.duration, duration: puDef.duration });
      this.showPopup(e.x, e.y - 24, d.label, `#${d.colour.toString(16).padStart(6,'0')}`, '14px');
      if (d.type === 'operating_rhythm') this.scoreManager.setComboWindow(this.executive.comboWindow + 2000);
    }
    this.spawnParticles(e.x, e.y, 10, d.colour, 200);
    audioManager.playSfx('powerup');
    this.removeEntity(e);
  }

  private hitBlocker(e: GameEntity) {
    const def = e.data as BlockerDef;
    if (this.player.abilityActive && this.executive.id === 'johan' && def.type === 'tech_debt') e.hp = 0;
    e.hp -= 1;
    this.spawnParticles(e.x, e.y, 10, def.dangerColour, 160);
    this.triggerShake(3, 100);
    audioManager.playSfx('bash');

    if (e.hp <= 0) {
      this.scoreManager.add(def.points, `SILO BASHED! +${def.points}`, 'silo_destroy');
      this.scoreManager.incCombo();
      this.scoreManager.addTransformation(5);
      if (def.missionTag) this.missionManager.progressByTag(def.missionTag);
      if (def.type === 'broken_handoff') this.scoreManager.restoreDeliveryHealth(10);

      const msg = BASH_MESSAGES[Math.floor(Math.random() * BASH_MESSAGES.length)];
      this.showPopup(e.x, e.y - 28, msg, '#aaccff', '12px');
      this.showPopup(e.x, e.y - 10, `+${def.points}`, '#ff6600', '18px');
      this.spawnParticles(e.x, e.y, 20, def.dangerColour, 200);
      this.triggerShake(6, 150);
      if (def.splits) { this.spawnBlocker('tool_sprawl'); this.spawnBlocker('tool_sprawl'); }
      if (this.player.abilityActive && this.executive.id === 'gina') this.spawnCollectible('market_offering');
      this.removeEntity(e);
    }
  }

  private hitBoss(e: GameEntity) {
    e.hp -= 1;
    this.spawnParticles(e.x, e.y, 15, 0xffffff, 200);
    this.triggerShake(8, 200);
    audioManager.playSfx('boss_hit');
    this.showPopup(e.x, e.y - 50, `HIT! ${e.hp}/${e.maxHp} HP`, '#ff4400', '16px');
    if (e.hp <= 0) this.defeatedBoss(e);
  }

  private defeatedBoss(e: GameEntity) {
    this.bossDefeated = true;
    this.bossEntity = null;
    this.scoreManager.add(2500, 'BOSS DEFEATED! +2500', 'boss_defeat');
    this.scoreManager.addTransformation(100);
    this.showPopup(e.x, e.y - 80, 'TRANSFORMATION ALIGNED!', '#ffffff', '30px');
    this.showPopup(e.x, e.y - 40, '+2500  SILO CORE DEFEATED!', '#ffcc00', '22px');
    [0xffffff, 0x00d4ff, 0xff6b35, 0xffcc00].forEach((c) =>
      this.spawnParticles(e.x, e.y, 40, c, 280)
    );
    this.triggerShake(14, 600);
    audioManager.playSfx('boss_defeat');
    this.emitter.emit(EVENTS.BOSS_DEFEAT);
    this.removeEntity(e);
    for (let i = 0; i < 80; i++) {
      this.time.delayedCall(i * 40, () =>
        this.spawnParticles(200 + Math.random() * (WORLD_WIDTH - 400), 100 + Math.random() * (WORLD_HEIGHT - 200), 3,
          Math.random() > 0.5 ? 0x00d4ff : 0xffcc00, 150)
      );
    }
  }

  private playerHitByBlocker(e: GameEntity) {
    if (this.player.invincible) return;
    const def = e.data as BlockerDef;
    if (this.player.abilityActive && this.executive.id === 'wayne' && def.type === 'margin_leak') {
      this.scoreManager.add(50, 'MARGIN SAVED!', 'margin');
      this.removeEntity(e);
      return;
    }
    this.scoreManager.damageDeliveryHealth((def.damage ?? 10) / 2);
    this.scoreManager.resetCombo();
    this.player.invincible = true;
    this.player.invincibleTimer = 1.2;
    if (def.hazardEffect === 'slow') { this.player.slow = 0.45; this.player.slowTimer = 2.5; }
    this.triggerShake(5, 120);
    audioManager.playSfx('hit');
    this.showPopup(this.player.x, this.player.y - 36, 'HIT! ' + def.label, '#ff4444', '14px');
  }

  private removeEntity(e: GameEntity) {
    e.active = false;
    e.graphics.destroy();
    e.label?.destroy();
    const idx = this.entities.indexOf(e);
    if (idx >= 0) this.entities.splice(idx, 1);
  }

  // ─── Boss ─────────────────────────────────────────────────────────────────

  private spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const x = WORLD_WIDTH / 2 - 80, y = WORLD_HEIGHT / 2 - 80;
    const e = this.addEntity('boss', x, y, { type: 'silo_core', label: 'SILO CORE', colour: 0x333355 });
    e.hp = 20; e.maxHp = 20; e.radius = 60;
    e.vx = 28; e.vy = 20;
    this.bossEntity = e;
    this.showPopup(x, y - 90, '⚠ THE SILO CORE APPEARS! ⚠', '#ff4400', '22px');
    this.showPopup(x, y - 60, 'Dash into it or use your Special!', '#ffaa66', '14px');
    audioManager.playSfx('warn');
    this.emitter.emit(EVENTS.BOSS_SPAWN);
  }

  // ─── Allies ───────────────────────────────────────────────────────────────

  private spawnAllies() {
    EXECUTIVES.filter((ex) => ex.id !== this.executive.id).forEach((exec, i) => {
      const a = (i / 5) * Math.PI * 2;
      const ally: AllyExecutive = {
        exec,
        x: this.player.x + Math.cos(a) * 90,
        y: this.player.y + Math.sin(a) * 90,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        alpha: 0, walkPhase: Math.random() * Math.PI * 2,
        graphics: this.add.graphics().setDepth(9),
        active: true, timer: ONE_FIRM_DURATION / 1000,
      };
      this.allies.push(ally);
      this.tweens.add({ targets: ally, alpha: 0.55, duration: 500, ease: 'Sine.easeOut' });
    });
  }

  private updateAllies(dt: number) {
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const al = this.allies[i];
      if (!al.active) continue;
      al.timer -= dt;
      if (al.timer <= 0) { al.graphics.destroy(); this.allies.splice(i, 1); continue; }

      // Simple AI: seek nearest collectible
      let tx = al.x, ty = al.y, bestD = 9999;
      this.entities.forEach((en) => {
        if (en.type !== 'collectible' && en.type !== 'client') return;
        const dx = en.x - al.x, dy = en.y - al.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) { bestD = d; tx = en.x; ty = en.y; }
      });
      const dx = tx - al.x, dy = ty - al.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) { al.vx += (dx / dist) * 130 * dt; al.vy += (dy / dist) * 130 * dt; }
      al.vx *= 0.90; al.vy *= 0.90;
      al.x += al.vx * dt; al.y += al.vy * dt;
      al.x = Phaser.Math.Clamp(al.x, 20, WORLD_WIDTH - 20);
      al.y = Phaser.Math.Clamp(al.y, 20, WORLD_HEIGHT - 20);
      const moving = Math.abs(al.vx) > 5 || Math.abs(al.vy) > 5;
      if (moving) al.walkPhase += dt * 8;

      // Draw as a translucent person
      const g = al.graphics;
      g.clear();
      this.drawPerson(g, al.x, al.y, al.exec.colour, al.exec.accentColour, al.walkPhase, moving, 0.75, al.alpha);

      // Collect nearby items
      this.entities.forEach((en) => {
        if (en.type !== 'collectible' && en.type !== 'client') return;
        const dx2 = al.x - en.x, dy2 = al.y - en.y;
        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < 22) {
          this.scoreManager.add(((en.data as CollectibleDef).points ?? 50) / 2, '+ally');
          this.removeEntity(en);
        }
      });

      // Bash nearby blockers
      this.entities.forEach((en) => {
        if (en.type !== 'blocker') return;
        const dx3 = al.x - en.x, dy3 = al.y - en.y;
        if (Math.sqrt(dx3 * dx3 + dy3 * dy3) < 26) {
          en.hp--;
          if (en.hp <= 0) {
            this.scoreManager.add((en.data as BlockerDef).points, 'ALLY BASH!', 'silo_destroy');
            this.removeEntity(en);
          }
        }
      });
    }
  }

  // ─── Power-ups ────────────────────────────────────────────────────────────

  private hasPowerup(type: string) {
    return this.activePowerups.some((p) => p.type === type && p.timer > 0);
  }

  private updatePowerups(dt: number) {
    const labels: string[] = [];
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const p = this.activePowerups[i];
      p.timer -= dt * 1000;
      if (p.timer <= 0) { this.activePowerups.splice(i, 1); }
      else {
        const def = POWER_UPS.find((d) => d.type === p.type);
        if (def) labels.push(`${def.label} ${(p.timer / 1000).toFixed(1)}s`);
      }
    }
    this.powerupDisplay?.setText(labels.join('  |  '));
  }

  // ─── One Firm Mode ────────────────────────────────────────────────────────

  private tryTriggerOneFirm() {
    if (this.oneFirmActive) return;
    if (this.scoreManager.getState().transformationMeter < 100) return;
    this.oneFirmActive = true;
    this.scoreManager.consumeTransformation();
    this.scoreManager.add(1000, 'ONE FIRM MODE! +1000');
    this.scoreManager.setMultiplierBoost(3);
    this.spawnAllies();
    audioManager.setOneFirmMode(true);
    this.missionManager.progressOneFirm();
    this.showPopup(this.player.x, this.player.y - 80, 'ONE FIRM MODE!', '#ffffff', '34px');

    this.time.delayedCall(ONE_FIRM_DURATION, () => {
      this.oneFirmActive = false;
      audioManager.setOneFirmMode(false);
      this.allies.forEach((al) => { al.active = false; al.graphics.destroy(); });
      this.allies = [];
      this.scoreManager.resetCombo();
    });
  }

  // ─── Ability ──────────────────────────────────────────────────────────────

  private activateAbility() {
    const p = this.player;
    if (p.abilityCharge < this.executive.ability.chargeRequired || p.abilityCooldown > 0) return;
    p.abilityActive = true;
    p.abilityTimer = this.executive.ability.duration / 1000;
    p.abilityCooldown = this.executive.ability.cooldown / 1000;
    p.abilityCharge = 0;
    audioManager.playSfx('ability');
    this.showPopup(p.x, p.y - 60, this.executive.ability.name, `#${this.executive.accentColour.toString(16).padStart(6,'0')}`, '20px');
    this.spawnParticles(p.x, p.y, 22, this.executive.colour, 200);
    this.triggerShake(4, 200);

    switch (this.executive.id) {
      case 'jason':  this.scoreManager.freezeComboDecay(true);
        this.time.delayedCall(this.executive.ability.duration, () => this.scoreManager.freezeComboDecay(false)); break;
      case 'luke': {
        this.entities.forEach((en) => {
          if (en.type !== 'blocker') return;
          const dx = p.x - en.x, dy = p.y - en.y;
          if (Math.sqrt(dx * dx + dy * dy) < 180) this.hitBlocker(en);
        });
        this.scoreManager.setComboWindow(this.executive.comboWindow + 3000);
        this.scoreManager.restoreDeliveryHealth(20);
        break;
      }
      case 'johan':
        p.invincible = true; p.invincibleTimer = this.executive.ability.duration / 1000; break;
      case 'wayne':
        this.scoreManager.setMultiplierBoost(2); break;
    }
  }

  private dash() {
    if (this.player.dashing || this.player.dashCooldown > 0) return;
    const p = this.player;
    p.dashing = true;
    p.dashTimer = PLAYER_DASH_DURATION / 1000;
    p.dashCooldown = PLAYER_DASH_COOLDOWN / 1000;
    const ix = this.player.facing.x || 0, iy = this.player.facing.y || 1;
    p.vx = ix * PLAYER_DASH_SPEED; p.vy = iy * PLAYER_DASH_SPEED;
    this.spawnParticles(p.x, p.y, 6, this.executive.accentColour, 120);
  }

  private isKeyDown(key: string) { return this.keys[key]?.isDown ?? false; }

  // ─── Screenshake ──────────────────────────────────────────────────────────

  private triggerShake(intensity: number, duration: number) {
    if (localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === '1') return;
    if (intensity > this.shakeIntensity) { this.shakeIntensity = intensity; this.shakeDuration = duration / 1000; }
  }

  private updateShake(dt: number) {
    if (this.shakeDuration <= 0) { this.cameras.main.setScroll(0, 0); return; }
    this.shakeDuration -= dt;
    const cx = this.cameras.main.scrollX, cy = this.cameras.main.scrollY;
    const i = this.shakeIntensity * Math.min(1, this.shakeDuration / 0.15);
    this.cameras.main.setScroll(cx + (Math.random() - 0.5) * i, cy + (Math.random() - 0.5) * i);
    if (this.shakeDuration <= 0) { this.shakeIntensity = 0; }
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  private setupEventHandlers() {
    this.emitter.on(EVENTS.MISSION_COMPLETE, (m: { title: string; reward: number }) => {
      this.scoreManager.completeMission();
      this.showPopup(this.player.x, this.player.y - 70, `MISSION: ${m.title}`, '#00ff99', '20px');
      this.showPopup(this.player.x, this.player.y - 42, `+${m.reward} BONUS!`, '#ffcc00', '18px');
      audioManager.playSfx('mission');
      this.spawnParticles(this.player.x, this.player.y, 25, 0x00ff99, 200);
    });
  }

  // ─── Pause ────────────────────────────────────────────────────────────────

  private togglePause() {
    this.paused = !this.paused;
    if (this.paused) this.showPauseMenu();
    else { this.pauseOverlay?.destroy(); this.pauseOverlay = undefined; }
  }

  private showPauseMenu() {
    // Zones inside containers with setScrollFactor(0) have misaligned hit areas
    // (Phaser hit-tests in world space). Keep visuals in the container but add
    // interactive zones directly to the scene with their own scrollFactor(0).
    const zones: Phaser.GameObjects.Zone[] = [];
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(60);
    this.pauseOverlay = c;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.72); bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    c.add(bg);

    const panel = this.add.graphics();
    panel.fillStyle(0x050f1a, 0.96);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 175, 400, 350, 14);
    panel.lineStyle(2, 0x00d4ff, 0.7);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 175, 400, 350, 14);
    c.add(panel);

    c.add(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 148, 'PAUSED', {
      fontSize: '30px', fontFamily: 'system-ui, Arial, sans-serif', fontStyle: 'bold', color: '#00d4ff',
    }).setOrigin(0.5));

    const destroyAll = () => { zones.forEach(z => z.destroy()); };

    const mkBtn = (y: number, lbl: string, col: number, bgc: number, fn: () => void) => {
      const bg2 = this.add.graphics();
      bg2.fillStyle(bgc, 0.9); bg2.fillRoundedRect(GAME_WIDTH / 2 - 140, y - 20, 280, 40, 8);
      bg2.lineStyle(2, col, 0.8); bg2.strokeRoundedRect(GAME_WIDTH / 2 - 140, y - 20, 280, 40, 8);
      const t = this.add.text(GAME_WIDTH / 2, y, lbl, {
        fontSize: '16px', fontFamily: 'system-ui, Arial, sans-serif', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      c.add([bg2, t]);
      const z = this.add.zone(GAME_WIDTH / 2, y, 280, 40)
        .setInteractive({ cursor: 'pointer' })
        .setScrollFactor(0).setDepth(61);
      z.on('pointerdown', fn);
      zones.push(z);
    };
    mkBtn(GAME_HEIGHT / 2 - 80, 'Resume',        0x00d4ff, 0x003366, () => { destroyAll(); this.togglePause(); });
    mkBtn(GAME_HEIGHT / 2 - 25, 'Mute: ' + (audioManager.isMuted() ? 'OFF' : 'ON'), 0x334455, 0x111122, () => audioManager.toggleMute());
    mkBtn(GAME_HEIGHT / 2 + 30, 'Restart',       0x0066ff, 0x001133, () => { destroyAll(); c.destroy(); this.paused = false; this.scene.restart(); });
    mkBtn(GAME_HEIGHT / 2 + 85, 'Main Menu',     0x334455, 0x111122, () => { destroyAll(); c.destroy(); this.paused = false; audioManager.stopMusic(); this.scene.start('MainMenu'); });

    c.once('destroy', destroyAll);
  }

  // ─── Tutorial ─────────────────────────────────────────────────────────────

  private showTutorial() {
    this.paused = true;
    // Visuals inside the container (scrollFactor inherited from container).
    // Interactive zone lives directly on the scene with its own scrollFactor(0)
    // to ensure hit-testing uses screen coordinates, not world coordinates.
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(70);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.88); bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    c.add(bg);

    const lines: Array<[string, string, string]> = [
      ['BASH THE SILOS!', '26px', '#00d4ff'],
      ['', '12px', '#fff'],
      ['WASD / Arrows: Move your executive around the world', '16px', '#cceeee'],
      ['Space: Dash-Bash — smash blockers!', '16px', '#cceeee'],
      ['E: Activate your Executive Special Ability', '16px', '#cceeee'],
      ['P / Esc: Pause   |   M: Mute', '16px', '#cceeee'],
      ['', '13px', '#fff'],
      ['Camera follows you through 4 districts.', '15px', '#aaccdd'],
      ['Collect items, bash silos, build your combo multiplier.', '15px', '#aaccdd'],
      ['Fill the Transformation Meter → ONE FIRM MODE!', '15px', '#aaccdd'],
      ['Defeat the Silo Core boss in the final surge!', '15px', '#ffaa66'],
    ];

    let ty = GAME_HEIGHT / 2 - 200;
    lines.forEach(([text, size, col]) => {
      c.add(this.add.text(GAME_WIDTH / 2, ty, text, {
        fontSize: size, fontFamily: 'system-ui, Arial, sans-serif', color: col, align: 'center',
      }).setOrigin(0.5));
      ty += parseInt(size) + 7;
    });

    const btnY = ty + 20;
    const b = this.add.graphics();
    b.fillStyle(0x003366, 0.9); b.fillRoundedRect(GAME_WIDTH / 2 - 130, btnY - 22, 260, 44, 8);
    b.lineStyle(2, 0x00d4ff, 0.9); b.strokeRoundedRect(GAME_WIDTH / 2 - 130, btnY - 22, 260, 44, 8);
    const bl = this.add.text(GAME_WIDTH / 2, btnY, "Let's go!", {
      fontSize: '18px', fontFamily: 'system-ui, Arial, sans-serif', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    c.add([b, bl]);

    const bz = this.add.zone(GAME_WIDTH / 2, btnY, 260, 44)
      .setInteractive({ cursor: 'pointer' })
      .setScrollFactor(0).setDepth(71);
    bz.on('pointerdown', () => {
      bz.destroy();
      c.destroy();
      this.paused = false;
      try { localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, '1'); } catch { /* ignore */ }
    });
    c.once('destroy', () => { if (bz.active) bz.destroy(); });
  }

  // ─── Main Update ──────────────────────────────────────────────────────────

  update(_time: number, delta: number) {
    if (this.paused || this.gameOver) return;
    const dt = Math.min(delta / 1000, 0.05); // cap at 50ms to avoid spiral

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver = true; this.endGame(); return; }

    if (!this.surgeActive && this.timeLeft <= SURGE_START) {
      this.surgeActive = true;
      audioManager.setSurgeMode(true);
      this.showPopup(this.player.x, this.player.y - 80, 'TRANSFORMATION SURGE!', '#ff4400', '26px');
    }
    if (!this.bossSpawned && this.timeLeft <= SURGE_START - 5) this.spawnBoss();

    this.updatePlayer(dt);
    this.updateEntities(dt);
    this.updateSpawner(dt);
    this.checkCollisions();
    this.tryTriggerOneFirm();
    this.updateAllies(dt);
    this.updatePowerups(dt);
    this.updateParticles(dt);
    this.updateShake(dt);
    this.updatePopups(dt);
    this.updateHud();
  }

  private updatePlayer(dt: number) {
    const p = this.player;

    // Tick timers
    if (p.dashCooldown > 0)    p.dashCooldown -= dt;
    if (p.abilityCooldown > 0) p.abilityCooldown -= dt;
    if (p.invincibleTimer > 0) { p.invincibleTimer -= dt; if (p.invincibleTimer <= 0) p.invincible = false; }
    if (p.slowTimer > 0)       { p.slowTimer -= dt; if (p.slowTimer <= 0) p.slow = 0; }
    if (p.abilityActive) {
      p.abilityTimer -= dt;
      if (p.abilityTimer <= 0) {
        p.abilityActive = false;
        if (this.executive.id === 'jason') this.scoreManager.freezeComboDecay(false);
        if (this.executive.id === 'johan') { p.invincible = false; p.invincibleTimer = 0; }
      }
    }

    // Charge ability
    if (!p.abilityActive && p.abilityCooldown <= 0)
      p.abilityCharge = Math.min(100, p.abilityCharge + 4 * dt);

    // Dash update
    if (p.dashing) {
      p.dashTimer -= dt;
      if (p.dashTimer <= 0) { p.dashing = false; p.vx = 0; p.vy = 0; }
    } else {
      // Gather directional input
      let ix = 0, iy = 0;
      if (this.touchActive && this.joystickActive) {
        ix = this.touchDir.x; iy = this.touchDir.y;
      } else {
        if (this.isKeyDown('left')  || this.isKeyDown('a')) ix -= 1;
        if (this.isKeyDown('right') || this.isKeyDown('d')) ix += 1;
        if (this.isKeyDown('up')    || this.isKeyDown('w')) iy -= 1;
        if (this.isKeyDown('down')  || this.isKeyDown('s')) iy += 1;
      }
      const len = Math.sqrt(ix * ix + iy * iy);
      if (len > 0) {
        ix /= len; iy /= len;
        p.facing = { x: ix, y: iy };
      }

      const speedMod = (p.slow > 0 ? p.slow : 1)
        * (this.hasPowerup('ai_accelerator') ? 1.4 : 1)
        * (this.oneFirmActive ? 1.2 : 1);
      p.vx = ix * p.speed * speedMod;
      p.vy = iy * p.speed * speedMod;
    }

    // Advance walk cycle
    const moving = Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10;
    if (moving) p.walkPhase += dt * 9;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Phaser.Math.Clamp(p.x, 22, WORLD_WIDTH - 22);
    p.y = Phaser.Math.Clamp(p.y, 22, WORLD_HEIGHT - 22);

    // Update camera target
    this.cameraTarget.setPosition(p.x, p.y);

    // Trail
    if (moving) {
      this.playerTrail.unshift({ x: p.x, y: p.y, alpha: 0.5 });
      if (this.playerTrail.length > 10) this.playerTrail.pop();
    }

    this.drawPlayer();
  }

  private updateEntities(dt: number) {
    this.entities.forEach((e) => {
      e.age += dt;

      if (e.type === 'blocker' || e.type === 'boss') {
        const slow = this.player.abilityActive && this.executive.id === 'luke' ? 0.3 : 1;
        e.x += e.vx * dt * slow;
        e.y += e.vy * dt * slow;

        if ((e.data as BlockerDef).type === 'scope_creep' && e.age > 5)
          e.radius = Math.min(44, e.radius + 0.4 * dt);

        if (e.type === 'boss') {
          const dx = this.player.x - e.x, dy = this.player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 100) { e.vx += (dx / dist) * 22 * dt; e.vy += (dy / dist) * 22 * dt; }
          if (Math.floor(e.age * 10) % 70 === 0 && Math.random() < 0.4) this.spawnBlocker('hype_cloud');
        }

        e.x = Phaser.Math.Clamp(e.x, e.radius, WORLD_WIDTH - e.radius);
        e.y = Phaser.Math.Clamp(e.y, e.radius, WORLD_HEIGHT - e.radius);
        if (e.x <= e.radius || e.x >= WORLD_WIDTH - e.radius)  e.vx *= -1;
        if (e.y <= e.radius || e.y >= WORLD_HEIGHT - e.radius) e.vy *= -1;
      }

      if ((e.type === 'collectible' && e.age > 18) ||
          (e.type === 'powerup'     && e.age > 12) ||
          (e.type === 'client'      && e.age > 15)) {
        this.removeEntity(e); return;
      }

      this.drawEntity(e);
    });
  }

  private updateSpawner(dt: number) {
    this.accelerateTimer += dt;
    if (this.accelerateTimer >= 10) {
      this.accelerateTimer = 0;
      this.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, this.spawnInterval - SPAWN_ACCELERATE_RATE);
    }
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const r = Math.random();
      if      (r < 0.40) this.spawnCollectible();
      else if (r < 0.62) this.spawnBlocker();
      else if (r < 0.75) this.spawnClientBadge();
      else if (r < 0.88) this.spawnPowerup();
      else if (Math.random() < 0.5) this.spawnCollectible('qualified_opp');
      else this.spawnBlocker('margin_leak');
    }
  }

  private endGame() {
    this.scoreManager.saveHighScore();
    audioManager.stopMusic();
    const state = this.scoreManager.getState();
    this.cameras.main.fadeOut(800, 5, 15, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Results', {
        score: state.total,
        combo: state.highCombo,
        clients: state.clientsCollected,
        opps: state.qualifiedOpps,
        silos: state.silosBusted,
        crossPillar: state.crossPillarCombos,
        missions: this.missionManager.getMissions().filter((m) => m.completed).length,
        trust: state.clientTrust,
        margin: state.marginProtected,
        deliveryHealth: state.deliveryHealth,
        executiveId: this.executive.id,
        bossDefeated: this.bossDefeated,
        endless: false,
      });
    });
  }
}
