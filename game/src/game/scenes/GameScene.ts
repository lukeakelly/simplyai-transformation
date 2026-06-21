import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, GAME_DURATION, SURGE_START,
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
  dashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  dashDir: { x: number; y: number };
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
  glow?: Phaser.GameObjects.Graphics;
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
  graphics: Phaser.GameObjects.Graphics;
  active: boolean;
  timer: number;
}

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
  private playerTrail: Array<{ x: number; y: number; alpha: number }> = [];

  // Input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // Entities
  private entities: GameEntity[] = [];
  private entityId = 0;
  private popups: PopupText[] = [];
  private allies: AllyExecutive[] = [];

  // Timers / state
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

  // HUD graphics (drawn procedurally)
  private hudContainer!: Phaser.GameObjects.Container;
  private hudBg!: Phaser.GameObjects.Graphics;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private meterBar!: Phaser.GameObjects.Graphics;
  private comboDisplay!: Phaser.GameObjects.Text;
  private missionTexts: Phaser.GameObjects.Text[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private transformMeterY = 0;
  private abilityMeterY = 0;
  private hudW = 220;

  // Touch
  private touchActive = false;
  private touchDir = { x: 0, y: 0 };
  private joystickBase?: Phaser.GameObjects.Graphics;
  private joystickThumb?: Phaser.GameObjects.Graphics;
  private joystickCenter = { x: 0, y: 0 };
  private joystickActive = false;
  private joystickId = -1;

  // Particles
  private particlePool: Phaser.GameObjects.Graphics[] = [];
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

  // Power-ups active
  private activePowerups: Array<{ type: string; timer: number; duration: number }> = [];
  private powerupDisplay!: Phaser.GameObjects.Text;

  // Background
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // Pause state
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
    this.cameras.main.setBackgroundColor('#050f1a');
    this.emitter = new Phaser.Events.EventEmitter();

    // Systems
    this.scoreManager = new ScoreManager(this.emitter);
    this.missionManager = new MissionManager(this.emitter);
    this.missionManager.init();
    this.transformManager = new TransformationManager(this.emitter, this.scoreManager);

    // Background
    this.bgGraphics = this.add.graphics();
    this.drawBackground();

    // Player
    this.playerGraphics = this.add.graphics();
    this.resetPlayer();

    // HUD
    this.buildHud();
    this.buildTouchControls();

    // Input
    this.setupInput();

    // Event handlers
    this.setupEventHandlers();

    // Tutorial (first play)
    const seen = localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN);
    if (!seen) {
      this.showTutorial();
    }

    // Fade in
    this.cameras.main.fadeIn(600, 5, 15, 26);

    // Begin music
    audioManager.init();
    audioManager.startMusic();
  }

  // ─── Background ───────────────────────────────────────────────────────────

  private drawBackground() {
    const g = this.bgGraphics;
    g.clear();
    // Main field
    g.fillStyle(0x050f1a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Four district zones
    const districts = [
      { x: 0, y: 0, w: GAME_WIDTH / 2, h: GAME_HEIGHT / 2, col: 0x00d4ff, label: 'DATA & AI', bg: 0x000d1a },
      { x: GAME_WIDTH / 2, y: 0, w: GAME_WIDTH / 2, h: GAME_HEIGHT / 2, col: 0xff6b35, label: 'AGENTIC AI', bg: 0x100500 },
      { x: 0, y: GAME_HEIGHT / 2, w: GAME_WIDTH / 2, h: GAME_HEIGHT / 2, col: 0x33ccff, label: 'CLOUD & INFRA', bg: 0x001222 },
      { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, w: GAME_WIDTH / 2, h: GAME_HEIGHT / 2, col: 0xff33aa, label: 'INNOVATION HUB', bg: 0x100010 },
    ];

    districts.forEach(({ x, y, w, h, col, bg }) => {
      g.fillStyle(bg, 1);
      g.fillRect(x, y, w, h);
      g.lineStyle(1, col, 0.08);
      for (let gx = 0; gx <= w; gx += 64) g.lineBetween(x + gx, y, x + gx, y + h);
      for (let gy = 0; gy <= h; gy += 64) g.lineBetween(x, y + gy, x + w, y + gy);
      // Corner glow
      g.fillStyle(col, 0.04);
      g.fillCircle(x + w / 2, y + h / 2, Math.min(w, h) * 0.4);
    });

    // Central plaza circle
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    g.fillStyle(0x001122, 0.8);
    g.fillCircle(cx, cy, 80);
    g.lineStyle(2, 0x00d4ff, 0.4);
    g.strokeCircle(cx, cy, 80);
    g.lineStyle(1, 0x00d4ff, 0.15);
    g.strokeCircle(cx, cy, 110);

    // District border lines
    g.lineStyle(2, 0x002244, 0.6);
    g.lineBetween(GAME_WIDTH / 2, 0, GAME_WIDTH / 2, GAME_HEIGHT);
    g.lineBetween(0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2);

    // District labels
    const labelStyle = { fontSize: '13px', fontFamily: 'system-ui, Arial, sans-serif', color: '#223344' };
    this.add.text(120, 24, 'DATA & AI DISTRICT', labelStyle);
    this.add.text(GAME_WIDTH / 2 + 60, 24, 'AGENTIC AI DISTRICT', { ...labelStyle, color: '#2d1800' });
    this.add.text(60, GAME_HEIGHT / 2 + 16, 'CLOUD & INFRA DISTRICT', { ...labelStyle, color: '#001c2d' });
    this.add.text(GAME_WIDTH / 2 + 60, GAME_HEIGHT / 2 + 16, 'INNOVATION HUB', { ...labelStyle, color: '#1c0010' });
    this.add.text(cx, cy, 'ONE FIRM\nPLAZA', {
      fontSize: '11px', fontFamily: 'system-ui, Arial, sans-serif',
      color: '#334455', align: 'center',
    }).setOrigin(0.5);
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  private resetPlayer() {
    this.player = {
      x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 20,
      vx: 0, vy: 0,
      speed: PLAYER_BASE_SPEED * this.executive.speed,
      dashing: false, dashTimer: 0, dashCooldown: 0,
      dashDir: { x: 0, y: 1 },
      abilityCharge: 0, abilityCooldown: 0,
      abilityActive: false, abilityTimer: 0,
      invincible: false, invincibleTimer: 0,
      slow: 0, slowTimer: 0,
    };
    this.playerTrail = [];
  }

  private drawPlayer() {
    const g = this.playerGraphics;
    g.clear();

    const p = this.player;
    const exec = this.executive;

    // Trail
    this.playerTrail.forEach((t, i) => {
      const a = (i / this.playerTrail.length) * 0.3;
      g.fillStyle(exec.colour, a);
      g.fillCircle(t.x, t.y, 14 * (i / this.playerTrail.length));
    });

    // Ability glow
    if (p.abilityActive) {
      g.fillStyle(exec.accentColour, 0.15);
      g.fillCircle(p.x, p.y, 55);
      g.lineStyle(2, exec.accentColour, 0.5);
      g.strokeCircle(p.x, p.y, 55 + Math.sin(this.time.now * 0.01) * 5);
    }

    // One Firm rainbow aura
    if (this.oneFirmActive) {
      const t = this.time.now * 0.004;
      const hue = (t % 1) * 360;
      const col = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6).color;
      g.fillStyle(col, 0.12);
      g.fillCircle(p.x, p.y, 45);
    }

    // Invincibility flash
    if (p.invincible && Math.floor(this.time.now / 80) % 2 === 0) return;

    // Dash flash
    if (p.dashing) {
      g.fillStyle(exec.accentColour, 0.6);
      g.fillCircle(p.x, p.y, 22);
    }

    // Body
    g.fillStyle(exec.colour, 1);
    g.fillCircle(p.x, p.y, 18);
    g.lineStyle(2, exec.accentColour, 0.9);
    g.strokeCircle(p.x, p.y, 18);

    // Inner
    g.fillStyle(exec.accentColour, 0.3);
    g.fillCircle(p.x - 4, p.y - 4, 8);

    // Direction indicator
    const dx = this.player.dashDir.x || 0;
    const dy = this.player.dashDir.y || 1;
    g.lineStyle(3, 0xffffff, 0.7);
    g.lineBetween(p.x, p.y, p.x + dx * 20, p.y + dy * 20);

    // Ability charge ring
    if (p.abilityCharge > 0) {
      const pct = p.abilityCharge / 100;
      g.lineStyle(3, exec.accentColour, 0.8 * pct);
      // Arc approximation
      g.strokeCircle(p.x, p.y, 26);
      if (pct >= 1) {
        g.fillStyle(exec.accentColour, 0.2);
        g.fillCircle(p.x, p.y, 26);
      }
    }
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

    this.input.keyboard!.on('keydown-P', () => this.togglePause());
    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard!.on('keydown-M', () => {
      const m = audioManager.toggleMute();
      this.showPopup(GAME_WIDTH / 2, 80, m ? 'Muted' : 'Sound ON', '#aabbcc');
    });
    this.input.keyboard!.on('keydown-SPACE', () => this.dash());
    this.input.keyboard!.on('keydown-E', () => this.activateAbility());
  }

  // ─── Touch controls ───────────────────────────────────────────────────────

  private buildTouchControls() {
    const isMobile = this.sys.game.device.input.touch;
    if (!isMobile) return;

    this.touchActive = true;
    const jcx = 100, jcy = GAME_HEIGHT - 100;
    this.joystickCenter = { x: jcx, y: jcy };

    // Joystick base
    this.joystickBase = this.add.graphics();
    this.joystickBase.fillStyle(0xffffff, 0.08);
    this.joystickBase.fillCircle(jcx, jcy, 55);
    this.joystickBase.lineStyle(2, 0x00d4ff, 0.25);
    this.joystickBase.strokeCircle(jcx, jcy, 55);
    this.joystickBase.setDepth(10);

    this.joystickThumb = this.add.graphics();
    this.joystickThumb.fillStyle(0x00d4ff, 0.45);
    this.joystickThumb.fillCircle(0, 0, 22);
    this.joystickThumb.setDepth(11);

    // Bash button
    const bashX = GAME_WIDTH - 100, bashY = GAME_HEIGHT - 100;
    const bashBg = this.add.graphics();
    bashBg.fillStyle(0xff6600, 0.3);
    bashBg.fillCircle(bashX, bashY, 45);
    bashBg.lineStyle(2, 0xff6600, 0.6);
    bashBg.strokeCircle(bashX, bashY, 45);
    bashBg.setDepth(10);
    this.add.text(bashX, bashY, 'BASH', {
      fontSize: '14px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ff9933',
    }).setOrigin(0.5).setDepth(11);

    // Ability button
    const abilX = GAME_WIDTH - 195, abilY = GAME_HEIGHT - 90;
    const abilBg = this.add.graphics();
    abilBg.fillStyle(this.executive.colour, 0.3);
    abilBg.fillCircle(abilX, abilY, 38);
    abilBg.lineStyle(2, this.executive.colour, 0.6);
    abilBg.strokeCircle(abilX, abilY, 38);
    abilBg.setDepth(10);
    this.add.text(abilX, abilY, 'POWER', {
      fontSize: '11px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    // Touch handling
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      const dx = ptr.x - jcx, dy = ptr.y - jcy;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        this.joystickId = ptr.id;
        this.joystickActive = true;
      }
      if (Math.abs(ptr.x - bashX) < 55 && Math.abs(ptr.y - bashY) < 55) {
        this.dash();
      }
      if (Math.abs(ptr.x - abilX) < 48 && Math.abs(ptr.y - abilY) < 48) {
        this.activateAbility();
      }
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.joystickActive && ptr.id === this.joystickId) {
        const dx = ptr.x - jcx, dy = ptr.y - jcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = 45;
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

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private buildHud() {
    const hudW = 220;
    const hudX = GAME_WIDTH - hudW;

    this.hudContainer = this.add.container(0, 0);
    this.hudBg = this.add.graphics();
    this.meterBar = this.add.graphics();

    // Semi-transparent HUD panel
    this.hudBg.fillStyle(0x000d1a, 0.88);
    this.hudBg.fillRect(hudX, 0, hudW, GAME_HEIGHT);
    this.hudBg.lineStyle(1, 0x00d4ff, 0.2);
    this.hudBg.lineBetween(hudX, 0, hudX, GAME_HEIGHT);

    const makeLabel = (x: number, y: number, text: string, colour = '#334455', size = '11px') => {
      return this.add.text(x, y, text, {
        fontSize: size, fontFamily: 'system-ui, Arial, sans-serif', color: colour,
      });
    };

    const makeValue = (x: number, y: number, text: string, colour = '#ffffff', size = '16px') => {
      return this.add.text(x, y, text, {
        fontSize: size, fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: 'bold', color: colour,
      });
    };

    const lx = hudX + 12, vx = GAME_WIDTH - 12;
    let ry = 16;

    // Executive name
    makeLabel(lx, ry, this.executive.name.toUpperCase(), `#${this.executive.accentColour.toString(16).padStart(6, '0')}`, '13px');
    ry += 18;
    makeLabel(lx, ry, this.executive.title, '#334455', '9px');
    ry += 24;

    // Divider
    const drawDiv = (y: number) => {
      const d = this.add.graphics();
      d.lineStyle(1, 0x003366, 0.5);
      d.lineBetween(lx, y, GAME_WIDTH - 12, y);
    };

    drawDiv(ry);
    ry += 8;

    // Score
    makeLabel(lx, ry, 'SCORE', '#556677');
    this.hudTexts.score = makeValue(vx, ry, '0', '#ffffff', '20px').setOrigin(1, 0);
    ry += 28;

    // Combo
    makeLabel(lx, ry, 'COMBO', '#556677');
    this.comboDisplay = makeValue(vx, ry, 'x1', '#00d4ff', '18px').setOrigin(1, 0);
    ry += 28;

    drawDiv(ry); ry += 8;

    // Stats
    const stats: Array<[string, string, string]> = [
      ['CLIENT TRUST', 'trust', '#ffcc00'],
      ['QUALIFIED OPPS', 'opps', '#ff9933'],
      ['DELIVERY HEALTH', 'health', '#00cc77'],
      ['CAPABILITY', 'capability', '#55aaff'],
      ['INNOVATION', 'innovation', '#ff33aa'],
      ['MARGIN PROTECTED', 'margin', '#ffcc00'],
    ];

    stats.forEach(([lbl, key, col]) => {
      makeLabel(lx, ry, lbl, '#445566', '10px');
      this.hudTexts[key] = makeValue(vx, ry, '0', col, '13px').setOrigin(1, 0);
      ry += 20;
    });

    drawDiv(ry); ry += 8;

    // Transformation meter
    makeLabel(lx, ry, 'TRANSFORMATION', '#556677', '10px');
    ry += 14;
    this.transformMeterY = ry;
    this.drawMeter(hudX + 12, ry, hudW - 24, 12, 0, 0x00d4ff);
    ry += 20;

    // Ability charge
    makeLabel(lx, ry, `${this.executive.ability.name}`, '#334455', '9px');
    ry += 12;
    this.abilityMeterY = ry;
    this.drawMeter(hudX + 12, ry, hudW - 24, 8, 0, this.executive.colour);
    ry += 16;

    drawDiv(ry); ry += 8;

    // Missions
    makeLabel(lx, ry, 'MISSIONS', '#556677', '10px');
    ry += 14;

    this.missionManager.getMissions().forEach((m, i) => {
      const mt = this.add.text(lx, ry + i * 32, `${m.title}`, {
        fontSize: '10px', fontFamily: 'system-ui, Arial, sans-serif',
        color: '#445566', wordWrap: { width: hudW - 24 },
      });
      const mp = this.add.text(lx, ry + i * 32 + 12, `${m.progress}/${m.target}`, {
        fontSize: '11px', fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: 'bold', color: '#667788',
      });
      this.missionTexts.push(mt, mp);
    });
    ry += this.missionManager.getMissions().length * 32 + 8;

    // Timer (top centre)
    this.timerText = this.add.text(GAME_WIDTH / 2, 16, '3:00', {
      fontSize: '32px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
      stroke: '#001122', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(5);

    // Power-up display
    this.powerupDisplay = this.add.text(GAME_WIDTH / 2 - hudW / 2, GAME_HEIGHT - 60, '', {
      fontSize: '13px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#00ff99',
    }).setOrigin(0.5).setDepth(5);
  }

  private drawMeter(x: number, y: number, w: number, h: number, pct: number, colour: number) {
    this.meterBar.fillStyle(0x112233, 1);
    this.meterBar.fillRoundedRect(x, y, w, h, 3);
    this.meterBar.fillStyle(colour, 0.85);
    this.meterBar.fillRoundedRect(x, y, Math.max(0, w * pct), h, 3);
  }

  private updateHud() {
    const state = this.scoreManager.getState();
    this.hudTexts.score?.setText(state.total.toLocaleString());
    const comboPct = Math.min(1, state.combo / 12);
    const comboCol = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x00d4ff),
      Phaser.Display.Color.ValueToColor(0xff6600),
      100, Math.round(comboPct * 100)
    );
    this.comboDisplay?.setText(`x${state.multiplier}  ${state.combo} HIT`).setColor(
      `#${comboCol.r.toString(16).padStart(2,'0')}${comboCol.g.toString(16).padStart(2,'0')}${comboCol.b.toString(16).padStart(2,'0')}`
    );
    this.hudTexts.trust?.setText(state.clientTrust.toLocaleString());
    this.hudTexts.opps?.setText(String(state.qualifiedOpps));
    this.hudTexts.health?.setText(`${Math.round(state.deliveryHealth)}%`);
    this.hudTexts.capability?.setText(state.capability.toLocaleString());
    this.hudTexts.innovation?.setText(state.innovation.toLocaleString());
    this.hudTexts.margin?.setText(state.marginProtected.toLocaleString());

    // Timer
    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
    if (this.timeLeft <= SURGE_START) {
      this.timerText.setColor('#ff4400');
    } else if (this.timeLeft <= 60) {
      this.timerText.setColor('#ffaa00');
    }

    // Transformation meter
    this.meterBar.clear();
    const hudX = GAME_WIDTH - this.hudW;
    this.drawMeter(hudX + 12, this.transformMeterY, this.hudW - 24, 12, state.transformationMeter / 100, 0x00d4ff);

    // Ability charge meter
    this.drawMeter(hudX + 12, this.abilityMeterY, this.hudW - 24, 8, this.player.abilityCharge / 100, this.executive.colour);

    // Mission progress
    const missions = this.missionManager.getMissions();
    missions.forEach((m, i) => {
      const base = i * 2;
      if (this.missionTexts[base]) {
        const col = m.completed ? '#00ff77' : '#445566';
        this.missionTexts[base].setColor(col).setText(
          (m.completed ? '✓ ' : '') + m.title
        );
      }
      if (this.missionTexts[base + 1]) {
        this.missionTexts[base + 1].setText(
          m.completed ? 'Complete!' : `${m.progress}/${m.target}`
        ).setColor(m.completed ? '#00ff77' : '#667788');
      }
    });
  }


  // ─── Popups ───────────────────────────────────────────────────────────────

  private showPopup(x: number, y: number, text: string, colour = '#ffffff', size = '15px') {
    const t = this.add.text(x, y, text, {
      fontSize: size, fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: colour,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    this.popups.push({ text: t, vy: -60, life: 1.2, maxLife: 1.2 });
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.text.y += p.vy * dt;
      p.vy *= 0.95;
      p.text.setAlpha(Math.max(0, p.life / p.maxLife));
      if (p.life <= 0) {
        p.text.destroy();
        this.popups.splice(i, 1);
      }
    }
  }

  // ─── Particles ────────────────────────────────────────────────────────────

  private spawnParticles(x: number, y: number, count: number, colour: number, speed = 150) {
    const rcm = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === '1';
    if (rcm) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.6);
      const g = this.add.graphics();
      const r = 2 + Math.random() * 3;
      g.fillStyle(colour, 1);
      g.fillCircle(0, 0, r);
      g.setPosition(x, y);
      g.setDepth(15);
      this.activeParticles.push({
        g, x, y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        colour, radius: r,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.vx *= 0.97;
      p.g.setPosition(p.x, p.y);
      p.g.setAlpha(Math.max(0, p.life / p.maxLife));
      if (p.life <= 0) {
        p.g.destroy();
        this.activeParticles.splice(i, 1);
      }
    }
  }

  // ─── Entities ─────────────────────────────────────────────────────────────

  private spawnCollectible(type?: string) {
    const pool = COLLECTIBLES.filter((c) => c.type !== 'one_firm_token' || Math.random() < 0.05);
    const def = type ? pool.find((c) => c.type === type) ?? pool[Math.floor(Math.random() * pool.length)]
                     : pool[Math.floor(Math.random() * pool.length)];

    const margin = 60;
    const hudW = 220;
    const x = margin + Math.random() * (GAME_WIDTH - hudW - margin * 2);
    const y = margin + Math.random() * (GAME_HEIGHT - margin * 2);

    this.addEntity('collectible', x, y, def);
  }

  private spawnBlocker(type?: string) {
    const basicTypes = ['silo_cube', 'scope_creep', 'tech_debt', 'ambiguity_fog', 'hype_cloud', 'tool_sprawl'];
    const pick = type ?? basicTypes[Math.floor(Math.random() * basicTypes.length)];
    const def = BLOCKERS.find((b) => b.type === pick) ?? BLOCKERS[0];

    const margin = 60;
    const hudW = 220;
    const x = margin + Math.random() * (GAME_WIDTH - hudW - margin * 2);
    const y = margin + Math.random() * (GAME_HEIGHT - margin * 2);

    this.addEntity('blocker', x, y, def);
  }

  private spawnPowerup() {
    const def = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
    const margin = 80;
    const hudW = 220;
    const x = margin + Math.random() * (GAME_WIDTH - hudW - margin * 2);
    const y = margin + Math.random() * (GAME_HEIGHT - margin * 2);
    this.addEntity('powerup', x, y, { type: def.type, label: def.label, colour: def.colour });
  }

  private spawnClientBadge() {
    const badge = CLIENT_BADGES[Math.floor(Math.random() * CLIENT_BADGES.length)];
    const margin = 80;
    const hudW = 220;
    const x = margin + Math.random() * (GAME_WIDTH - hudW - margin * 2);
    const y = margin + Math.random() * (GAME_HEIGHT - margin * 2);
    this.addEntity('client', x, y, { type: 'client_badge', label: badge.label, colour: badge.colour, sector: badge.sector } as any);
  }

  private addEntity(
    category: 'collectible' | 'blocker' | 'powerup' | 'client' | 'boss',
    x: number, y: number,
    data: CollectibleDef | BlockerDef | { type: string; label: string; colour: number },
  ): GameEntity {
    const g = this.add.graphics();
    g.setDepth(5);

    const bd = data as BlockerDef;
    const cd = data as CollectibleDef;
    const radius = category === 'blocker' ? (bd.size ?? 20)
                 : category === 'boss'    ? 60
                 : category === 'client'  ? 18
                 : category === 'powerup' ? 16
                 : (cd.shape === 'star' ? 14 : 14);

    const hp = category === 'blocker' ? (bd.health ?? 1)
             : category === 'boss'    ? 20
             : 1;

    let vx = 0, vy = 0;
    if (category === 'blocker') {
      const spd = bd.speed ?? 0;
      if (spd > 0) {
        const a = Math.random() * Math.PI * 2;
        vx = Math.cos(a) * spd;
        vy = Math.sin(a) * spd;
      }
    }

    const entity: GameEntity = {
      id: this.entityId++,
      x, y, vx, vy,
      radius,
      hp, maxHp: hp,
      type: category,
      data,
      graphics: g,
      age: 0,
      pillar: cd.pillar,
      active: true,
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

    if (e.type === 'boss') {
      this.drawBoss(g, e);
      return;
    }

    if (e.type === 'blocker') {
      const bd = e.data as BlockerDef;
      const hpPct = e.hp / e.maxHp;
      g.fillStyle(colour, 0.9);
      const s = r * 1.8 * pulse;
      g.fillRect(e.x - s / 2, e.y - s / 2, s, s);
      g.lineStyle(2, bd.dangerColour, 0.9);
      g.strokeRect(e.x - s / 2, e.y - s / 2, s, s);
      // HP bar above
      if (e.maxHp > 1) {
        g.fillStyle(0x222222, 1);
        g.fillRect(e.x - r, e.y - r - 10, r * 2, 5);
        g.fillStyle(0xff4444, 1);
        g.fillRect(e.x - r, e.y - r - 10, r * 2 * hpPct, 5);
      }
      return;
    }

    if (e.type === 'powerup') {
      g.fillStyle(colour, 0.18);
      g.fillCircle(e.x, e.y, r * 2 * pulse);
      g.lineStyle(2, colour, 0.8);
      g.strokeCircle(e.x, e.y, r * pulse);
      g.fillStyle(colour, 0.9);
      g.fillCircle(e.x, e.y, r * 0.6 * pulse);
      return;
    }

    if (e.type === 'client') {
      const cd = e.data as any;
      g.fillStyle(cd.colour ?? 0x1144aa, 0.85);
      g.fillRoundedRect(e.x - r, e.y - r, r * 2, r * 2, 4);
      g.lineStyle(2, 0x3366ff, 0.9);
      g.strokeRoundedRect(e.x - r, e.y - r, r * 2, r * 2, 4);
      g.fillStyle(0xffffff, 0.15);
      g.fillCircle(e.x - 2, e.y - 2, r * 0.5);
      return;
    }

    // Collectible
    const cd = e.data as CollectibleDef;
    const shape = cd.shape ?? 'circle';

    // Glow
    g.fillStyle(cd.glowColour ?? colour, 0.12);
    g.fillCircle(e.x, e.y, r * 2.2);

    g.fillStyle(colour, 0.95);

    switch (shape) {
      case 'circle':
        g.fillCircle(e.x, e.y, r * pulse);
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
          const rr = i % 2 === 0 ? r * pulse : r * 0.45 * pulse;
          pts.push(new Phaser.Geom.Point(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr));
        }
        g.fillPoints(pts, true);
        break;
      }
      case 'hexagon': {
        const pts: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          pts.push(new Phaser.Geom.Point(e.x + Math.cos(a) * r * pulse * 0.9, e.y + Math.sin(a) * r * pulse * 0.9));
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
    const pulse = 1 + Math.sin(e.age * 2) * 0.05;
    const faceCols = [0x00d4ff, 0xff6b35, 0x33ccff, 0xff33aa];

    for (let i = 0; i < 4; i++) {
      const qx = (i % 2 === 0 ? -1 : 0);
      const qy = (i < 2 ? -1 : 0);
      g.fillStyle(faceCols[i], 0.85);
      g.fillRect(e.x + qx * r * pulse, e.y + qy * r * pulse, r * pulse, r * pulse);
      g.lineStyle(2, 0x000000, 0.4);
      g.strokeRect(e.x + qx * r * pulse, e.y + qy * r * pulse, r * pulse, r * pulse);
    }

    // Core
    g.fillStyle(0xffffff, 0.25 * hpPct);
    g.fillCircle(e.x, e.y, r * 0.3 * pulse);
    g.lineStyle(3, 0xffffff, 0.7 * hpPct);
    g.strokeCircle(e.x, e.y, r * 0.3 * pulse);

    // HP bar
    const barW = r * 2.5;
    g.fillStyle(0x222222, 1);
    g.fillRect(e.x - barW / 2, e.y - r * 1.4, barW, 8);
    g.fillStyle(hpPct > 0.5 ? 0x00ff44 : hpPct > 0.25 ? 0xffaa00 : 0xff2222, 1);
    g.fillRect(e.x - barW / 2, e.y - r * 1.4, barW * hpPct, 8);
  }

  // ─── Collision ────────────────────────────────────────────────────────────

  private checkCollisions() {
    const p = this.player;
    const pr = 18;
    const bashR = p.dashing ? 40 : pr;

    const hudLeft = GAME_WIDTH - 220;

    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.active) continue;

      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Magnet for One Firm / KNOWLEDGE_HUB
      const magnetR = this.oneFirmActive ? 120
                    : this.hasPowerup('knowledge_hub') ? 100
                    : this.hasPowerup('presales_beacon') ? 80 : 0;

      if (magnetR > 0 && e.type === 'collectible' && dist < magnetR) {
        const speed = 180;
        const nx = dx / Math.max(1, dist), ny = dy / Math.max(1, dist);
        e.x += nx * speed * 0.016;
        e.y += ny * speed * 0.016;
      }

      if (dist < bashR + e.radius) {
        if (e.type === 'collectible') {
          this.collectItem(e);
        } else if (e.type === 'client') {
          this.collectClient(e);
        } else if (e.type === 'powerup') {
          this.collectPowerup(e);
        } else if (e.type === 'blocker') {
          if (p.dashing || p.abilityActive) {
            this.hitBlocker(e);
          } else if (!p.invincible) {
            this.playerHitByBlocker(e);
          }
        } else if (e.type === 'boss') {
          if (p.dashing || p.abilityActive) {
            this.hitBoss(e);
          } else if (!p.invincible) {
            this.playerHitByBlocker(e);
          }
        }
      }

      // Keep entities in game bounds (not HUD area)
      if (e.type === 'blocker' || e.type === 'boss') {
        if (e.x < e.radius) { e.x = e.radius; e.vx = Math.abs(e.vx); }
        if (e.x > hudLeft - e.radius) { e.x = hudLeft - e.radius; e.vx = -Math.abs(e.vx); }
        if (e.y < e.radius) { e.y = e.radius; e.vy = Math.abs(e.vy); }
        if (e.y > GAME_HEIGHT - e.radius) { e.y = GAME_HEIGHT - e.radius; e.vy = -Math.abs(e.vy); }
      }
    }
  }

  private collectItem(e: GameEntity) {
    const def = e.data as CollectibleDef;
    let points = def.points;

    // Bonuses
    if (def.type === 'client_trust_aura' || this.hasPowerup('client_trust_aura')) {
      if (['client_badge', 'qualified_opp', 'client_outcome'].includes(def.type)) points *= 2;
    }
    if (this.oneFirmActive) points = Math.round(points * 1.5);
    if (this.executive.id === 'kylie' && this.player.abilityActive &&
        ['client_badge', 'qualified_opp'].includes(def.type)) {
      points *= 2;
    }
    if (this.executive.id === 'gina' && this.player.abilityActive) {
      if (['innovation_spark', 'pov_prism'].includes(def.type)) points *= 2;
    }

    const label = SCORE_POPUP_LABELS[def.type] ?? `+${points} ${def.label.toUpperCase()}`;
    this.scoreManager.add(points, label, def.type);
    this.scoreManager.incCombo(def.pillar);
    this.scoreManager.addTransformation(3 + Math.floor(points / 40));

    // Category tracking
    if (def.type === 'capability_card' || def.type === 'cross_skill') {
      this.scoreManager.getState().capability += points;
    }
    if (['innovation_spark', 'pov_prism', 'reusable_acc', 'market_offering'].includes(def.type)) {
      this.scoreManager.getState().innovation += points;
    }

    // Mission progress
    if (def.missionTag) {
      this.missionManager.progressByTag(def.missionTag);
    }
    if (def.type === 'one_firm_token') {
      this.scoreManager.addTransformation(25);
    }

    this.showPopup(e.x, e.y - 20, `+${points}`, `#${def.colour.toString(16).padStart(6, '0')}`, '14px');
    this.spawnParticles(e.x, e.y, 8, def.colour);
    audioManager.playSfx('collect');

    const combo = this.scoreManager.getState().combo;
    const callout = COMBO_CALLOUTS[combo];
    if (callout) {
      this.showPopup(GAME_WIDTH / 2 - 50, GAME_HEIGHT / 2 - 60, callout, '#ffcc00', '20px');
      audioManager.playSfx('combo');
    }

    this.missionManager.progressCombo(combo);
    this.removeEntity(e);
  }

  private collectClient(e: GameEntity) {
    const d = e.data as any;
    let points = 100;
    if (this.hasPowerup('client_trust_aura')) points = 200;
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

    this.showPopup(e.x, e.y - 20, `+${points} CLIENT TRUST`, '#ffcc00', '15px');
    this.spawnParticles(e.x, e.y, 12, 0xffcc00, 180);
    audioManager.playSfx('client');
    this.removeEntity(e);
  }

  private collectPowerup(e: GameEntity) {
    const d = e.data as { type: string; label: string; colour: number };
    const puDef = POWER_UPS.find((p) => p.type === d.type);

    if (d.type === 'one_firm_token') {
      this.scoreManager.addTransformation(25);
      this.showPopup(e.x, e.y - 20, 'ONE FIRM BOOST! +25', '#ffffff', '16px');
    } else if (puDef) {
      this.activePowerups.push({ type: d.type, timer: puDef.duration, duration: puDef.duration });
      this.showPopup(e.x, e.y - 20, d.label, `#${d.colour.toString(16).padStart(6, '0')}`, '15px');

      if (d.type === 'operating_rhythm') {
        this.scoreManager.setComboWindow(this.executive.comboWindow + 2000);
      }
    }

    this.spawnParticles(e.x, e.y, 10, d.colour, 200);
    audioManager.playSfx('powerup');
    this.removeEntity(e);
  }

  private hitBlocker(e: GameEntity) {
    const def = e.data as BlockerDef;
    let dmgMult = this.executive.bashPower;
    if (this.player.abilityActive && this.executive.id === 'luke') dmgMult *= 2;
    if (this.player.abilityActive && this.executive.id === 'johan') {
      // Architecture shield auto-destroys tech debt
      if (def.type === 'tech_debt') { e.hp = 0; }
    }

    e.hp -= 1;
    void dmgMult;

    this.spawnParticles(e.x, e.y, 10, def.dangerColour, 160);
    this.triggerShake(3, 100);
    audioManager.playSfx('bash');

    if (e.hp <= 0) {
      this.scoreManager.add(def.points, `SILO BASHED! +${def.points}`, 'silo_destroy');
      this.scoreManager.incCombo();
      this.scoreManager.addTransformation(5);
      // Use missionTag from def if available (avoids double-counting)
      if (def.missionTag) {
        this.missionManager.progressByTag(def.missionTag);
      }
      if (def.type === 'broken_handoff') {
        this.scoreManager.restoreDeliveryHealth(10);
      }

      const msg = BASH_MESSAGES[Math.floor(Math.random() * BASH_MESSAGES.length)];
      this.showPopup(e.x, e.y - 30, msg, '#aaccff', '13px');
      this.showPopup(e.x, e.y - 10, `+${def.points}`, '#ff6600', '18px');
      this.spawnParticles(e.x, e.y, 18, def.dangerColour, 200);
      this.triggerShake(6, 150);

      // Splits
      if (def.splits) {
        for (let i = 0; i < 2; i++) {
          this.spawnBlocker('tool_sprawl');
        }
      }

      // Gina: convert blocker to offering
      if (this.player.abilityActive && this.executive.id === 'gina') {
        this.spawnCollectible('market_offering');
      }

      this.removeEntity(e);
      audioManager.playSfx('bash');
    }
  }

  private hitBoss(e: GameEntity) {
    e.hp -= 1;
    this.spawnParticles(e.x, e.y, 15, 0xffffff, 200);
    this.triggerShake(8, 200);
    audioManager.playSfx('boss_hit');

    this.showPopup(e.x, e.y - 40, `HIT! ${e.hp}/${e.maxHp} HP`, '#ff4400', '16px');

    if (e.hp <= 0) {
      this.defeatedBoss(e);
    }
  }

  private defeatedBoss(e: GameEntity) {
    this.bossDefeated = true;
    this.bossEntity = null;

    this.scoreManager.add(2500, 'BOSS DEFEATED! +2500', 'boss_defeat');
    this.scoreManager.addTransformation(100);

    this.showPopup(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'TRANSFORMATION ALIGNED!', '#ffffff', '32px');
    this.showPopup(GAME_WIDTH / 2, GAME_HEIGHT / 2, '+2500  SILO CORE DEFEATED!', '#ffcc00', '24px');

    this.spawnParticles(e.x, e.y, 60, 0xffffff, 300);
    this.spawnParticles(e.x, e.y, 40, 0x00d4ff, 250);
    this.spawnParticles(e.x, e.y, 40, 0xff6b35, 220);
    this.triggerShake(15, 600);

    audioManager.playSfx('boss_defeat');
    this.emitter.emit(EVENTS.BOSS_DEFEAT);

    this.removeEntity(e);

    // Confetti
    for (let i = 0; i < 80; i++) {
      this.time.delayedCall(i * 40, () => {
        this.spawnParticles(
          200 + Math.random() * (GAME_WIDTH - 400),
          100 + Math.random() * (GAME_HEIGHT - 200),
          3, Math.random() > 0.5 ? 0x00d4ff : 0xffcc00, 150
        );
      });
    }
  }

  private playerHitByBlocker(e: GameEntity) {
    if (this.player.invincible) return;
    const def = e.data as BlockerDef;
    const dmg = def.damage ?? 10;

    // Wayne: Margin Guard prevents score loss
    if (this.player.abilityActive && this.executive.id === 'wayne' && def.type === 'margin_leak') {
      // Convert to value
      this.scoreManager.add(50, 'MARGIN SAVED!', 'margin');
      this.removeEntity(e);
      return;
    }

    this.scoreManager.damageDeliveryHealth(dmg / 2);
    this.scoreManager.resetCombo();
    this.player.invincible = true;
    this.player.invincibleTimer = 1.2;

    if (def.hazardEffect === 'slow') {
      this.player.slow = 0.45;
      this.player.slowTimer = 2.5;
    }

    this.triggerShake(5, 120);
    audioManager.playSfx('hit');
    this.showPopup(this.player.x, this.player.y - 30, 'HIT! ' + def.label, '#ff4444', '14px');
  }

  private removeEntity(e: GameEntity) {
    e.active = false;
    e.graphics.destroy();
    e.label?.destroy();
    e.glow?.destroy();
    const idx = this.entities.indexOf(e);
    if (idx >= 0) this.entities.splice(idx, 1);
  }

  // ─── Boss ─────────────────────────────────────────────────────────────────

  private spawnBoss() {
    if (this.bossSpawned) return;
    this.bossSpawned = true;

    const x = GAME_WIDTH / 2 - 110;
    const y = GAME_HEIGHT / 2 - 40;

    const e = this.addEntity('boss', x, y, { type: 'silo_core', label: 'SILO CORE', colour: 0x333355 });
    e.hp = 20; e.maxHp = 20; e.radius = 60;
    e.vx = 25; e.vy = 18;
    this.bossEntity = e;

    this.showPopup(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, '⚠ THE SILO CORE APPEARS! ⚠', '#ff4400', '24px');
    this.showPopup(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 85, 'Bash it with Dash or Special Ability!', '#ffaa66', '15px');
    audioManager.playSfx('warn');
    this.emitter.emit(EVENTS.BOSS_SPAWN);
  }

  // ─── Allies ───────────────────────────────────────────────────────────────

  private spawnAllies() {
    const others = EXECUTIVES.filter((e) => e.id !== this.executive.id);
    others.forEach((exec, i) => {
      const angle = (i / others.length) * Math.PI * 2;
      const r = 80;
      const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
      const ally: AllyExecutive = {
        exec,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        alpha: 0,
        graphics: this.add.graphics(),
        active: true,
        timer: ONE_FIRM_DURATION / 1000,
      };
      ally.graphics.setDepth(7);
      this.allies.push(ally);

      this.tweens.add({
        targets: ally,
        alpha: 0.6,
        duration: 600,
        ease: 'Sine.easeOut',
      });
    });
  }

  private updateAllies(dt: number) {
    const hudLeft = GAME_WIDTH - 220;
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const a = this.allies[i];
      if (!a.active) continue;

      a.timer -= dt;
      if (a.timer <= 0) {
        a.graphics.destroy();
        this.allies.splice(i, 1);
        continue;
      }

      // Simple AI: move towards nearest collectible
      let targetX = a.x, targetY = a.y;
      let bestDist = 999;
      this.entities.forEach((e) => {
        if (e.type !== 'collectible' && e.type !== 'client') return;
        const dx = e.x - a.x, dy = e.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          targetX = e.x;
          targetY = e.y;
        }
      });

      const dx = targetX - a.x, dy = targetY - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        a.vx += (dx / dist) * 150 * dt;
        a.vy += (dy / dist) * 150 * dt;
      }
      a.vx *= 0.92;
      a.vy *= 0.92;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.x = Math.max(20, Math.min(hudLeft - 20, a.x));
      a.y = Math.max(20, Math.min(GAME_HEIGHT - 20, a.y));

      // Draw ally
      const g = a.graphics;
      g.clear();
      g.fillStyle(a.exec.colour, a.alpha * 0.6);
      g.fillCircle(a.x, a.y, 14);
      g.lineStyle(1, a.exec.accentColour, a.alpha * 0.8);
      g.strokeCircle(a.x, a.y, 14);

      // Ally collect nearby items
      this.entities.forEach((e) => {
        if (e.type !== 'collectible' && e.type !== 'client') return;
        const dx2 = a.x - e.x, dy2 = a.y - e.y;
        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < 20) {
          const cd = e.data as CollectibleDef;
          this.scoreManager.add((cd.points ?? 50) / 2, '+ally collect');
          this.removeEntity(e);
        }
      });

      // Ally bash blockers
      this.entities.forEach((e) => {
        if (e.type !== 'blocker') return;
        const dx3 = a.x - e.x, dy3 = a.y - e.y;
        if (Math.sqrt(dx3 * dx3 + dy3 * dy3) < 25) {
          e.hp--;
          if (e.hp <= 0) {
            this.scoreManager.add((e.data as BlockerDef).points, 'ALLY BASH!', 'silo_destroy');
            this.removeEntity(e);
          }
        }
      });
    }
  }

  // ─── Power-ups ────────────────────────────────────────────────────────────

  private hasPowerup(type: string): boolean {
    return this.activePowerups.some((p) => p.type === type && p.timer > 0);
  }

  private updatePowerups(dt: number) {
    const labels: string[] = [];
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const p = this.activePowerups[i];
      p.timer -= dt * 1000;
      if (p.timer <= 0) {
        this.activePowerups.splice(i, 1);
        audioManager.playSfx('warn');
      } else {
        const puDef = POWER_UPS.find((pu) => pu.type === p.type);
        if (puDef) labels.push(`${puDef.label} ${(p.timer / 1000).toFixed(1)}s`);
      }
    }
    this.powerupDisplay?.setText(labels.join('  |  '));
  }

  // ─── One Firm Mode ────────────────────────────────────────────────────────

  private tryTriggerOneFirm() {
    if (this.oneFirmActive) return;
    const state = this.scoreManager.getState();
    if (state.transformationMeter >= 100) {
      this.oneFirmActive = true;
      this.scoreManager.consumeTransformation();
      this.scoreManager.add(1000, 'ONE FIRM MODE! +1000');
      this.scoreManager.setMultiplierBoost(3);
      this.spawnAllies();
      audioManager.setOneFirmMode(true);
      this.missionManager.progressOneFirm();

      this.showPopup(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 - 100, 'ONE FIRM MODE!', '#ffffff', '36px');

      this.time.delayedCall(ONE_FIRM_DURATION, () => {
        this.oneFirmActive = false;
        audioManager.setOneFirmMode(false);
        this.allies.forEach((a) => { a.active = false; a.graphics.destroy(); });
        this.allies = [];
        this.scoreManager.resetCombo();
      });
    }
  }

  // ─── Ability ──────────────────────────────────────────────────────────────

  private activateAbility() {
    const p = this.player;
    if (p.abilityCharge < this.executive.ability.chargeRequired) return;
    if (p.abilityCooldown > 0) return;

    p.abilityActive = true;
    p.abilityTimer = this.executive.ability.duration / 1000;
    p.abilityCooldown = this.executive.ability.cooldown / 1000;
    p.abilityCharge = 0;

    audioManager.playSfx('ability');
    this.showPopup(this.player.x, this.player.y - 50, this.executive.ability.name, `#${this.executive.accentColour.toString(16).padStart(6, '0')}`, '20px');
    this.spawnParticles(this.player.x, this.player.y, 20, this.executive.colour, 200);
    this.triggerShake(4, 200);

    // Executive-specific effects
    switch (this.executive.id) {
      case 'jason':
        this.scoreManager.freezeComboDecay(true);
        this.time.delayedCall(this.executive.ability.duration, () => {
          this.scoreManager.freezeComboDecay(false);
        });
        break;
      case 'kylie':
        // Magnet + upgrade handled in collectItem checks
        break;
      case 'luke': {
        // Clear nearby blockers
        this.entities.forEach((e) => {
          if (e.type !== 'blocker') return;
          const dx = this.player.x - e.x, dy = this.player.y - e.y;
          if (Math.sqrt(dx * dx + dy * dy) < 150) {
            this.hitBlocker(e);
          }
        });
        this.scoreManager.setComboWindow(this.executive.comboWindow + 3000);
        this.scoreManager.restoreDeliveryHealth(20);
        break;
      }
      case 'johan':
        // Shield handled in collision checks
        this.player.invincible = true;
        this.player.invincibleTimer = this.executive.ability.duration / 1000;
        break;
      case 'gina':
        // Blockers -> offerings; doubles innovation; handled in collectItem
        break;
      case 'wayne':
        // Convert margin leaks; prevent score deductions; handled in playerHitByBlocker
        this.scoreManager.setMultiplierBoost(2);
        break;
    }
  }

  private dash() {
    if (this.player.dashing) return;
    if (this.player.dashCooldown > 0) return;

    const p = this.player;
    p.dashing = true;
    p.dashTimer = PLAYER_DASH_DURATION / 1000;
    p.dashCooldown = PLAYER_DASH_COOLDOWN / 1000;

    // Determine dash direction from input or movement
    const dx = (this.isKeyDown('right') || this.isKeyDown('d') ? 1 : 0) -
               (this.isKeyDown('left') || this.isKeyDown('a') ? 1 : 0);
    const dy = (this.isKeyDown('down') || this.isKeyDown('s') ? 1 : 0) -
               (this.isKeyDown('up') || this.isKeyDown('w') ? 1 : 0);
    const len = Math.sqrt(dx * dx + dy * dy);
    p.dashDir = len > 0 ? { x: dx / len, y: dy / len } : p.dashDir;

    p.vx = p.dashDir.x * PLAYER_DASH_SPEED;
    p.vy = p.dashDir.y * PLAYER_DASH_SPEED;
    this.spawnParticles(p.x, p.y, 6, this.executive.accentColour, 120);
  }

  private isKeyDown(key: string): boolean {
    return this.keys[key]?.isDown ?? false;
  }

  // ─── Screenshake ──────────────────────────────────────────────────────────

  private triggerShake(intensity: number, duration: number) {
    const rcm = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === '1';
    if (rcm) return;
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration / 1000;
    }
  }

  private updateShake(dt: number) {
    if (this.shakeDuration <= 0) {
      this.cameras.main.setScroll(0, 0);
      return;
    }
    this.shakeDuration -= dt;
    const i = this.shakeIntensity * (this.shakeDuration / 0.2);
    this.cameras.main.setScroll(
      (Math.random() - 0.5) * i,
      (Math.random() - 0.5) * i,
    );
    if (this.shakeDuration <= 0) {
      this.cameras.main.setScroll(0, 0);
      this.shakeIntensity = 0;
    }
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────

  private setupEventHandlers() {
    this.emitter.on(EVENTS.MISSION_COMPLETE, (m: { title: string; reward: number }) => {
      this.scoreManager.completeMission();
      this.showPopup(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 - 60, `MISSION: ${m.title}`, '#00ff99', '22px');
      this.showPopup(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 - 30, `+${m.reward} BONUS!`, '#ffcc00', '20px');
      audioManager.playSfx('mission');
      this.spawnParticles(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2, 25, 0x00ff99, 200);
    });
  }

  // ─── Pause ────────────────────────────────────────────────────────────────

  private togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.showPauseMenu();
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  private showPauseMenu() {
    const c = this.add.container(0, 0);
    this.pauseOverlay = c;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    c.add(bg);

    const panel = this.add.graphics();
    panel.fillStyle(0x050f1a, 0.96);
    panel.fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 180, 400, 360, 14);
    panel.lineStyle(2, 0x00d4ff, 0.7);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 - 180, 400, 360, 14);
    c.add(panel);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'PAUSED', {
      fontSize: '32px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#00d4ff',
    }).setOrigin(0.5);
    c.add(title);

    const makeBtn = (y: number, label: string, col: number, bg: number, fn: () => void) => {
      const bg2 = this.add.graphics();
      bg2.fillStyle(bg, 0.9);
      bg2.fillRoundedRect(GAME_WIDTH / 2 - 150, y - 22, 300, 44, 8);
      bg2.lineStyle(2, col, 0.8);
      bg2.strokeRoundedRect(GAME_WIDTH / 2 - 150, y - 22, 300, 44, 8);
      const t = this.add.text(GAME_WIDTH / 2, y, label, {
        fontSize: '16px', fontFamily: 'system-ui, Arial, sans-serif',
        fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      const z = this.add.zone(GAME_WIDTH / 2, y, 300, 44).setInteractive({ cursor: 'pointer' });
      z.on('pointerdown', fn);
      c.add([bg2, t, z]);
    };

    makeBtn(GAME_HEIGHT / 2 - 70, 'Resume', 0x00d4ff, 0x003366, () => this.togglePause());
    makeBtn(GAME_HEIGHT / 2 - 10, 'Mute: ' + (audioManager.isMuted() ? 'OFF' : 'ON'), 0x334455, 0x111122, () => audioManager.toggleMute());
    makeBtn(GAME_HEIGHT / 2 + 50, 'Restart', 0x0066ff, 0x001133, () => {
      c.destroy();
      this.paused = false;
      this.scene.restart();
    });
    makeBtn(GAME_HEIGHT / 2 + 110, 'Main Menu', 0x334455, 0x111122, () => {
      c.destroy();
      this.paused = false;
      audioManager.stopMusic();
      this.scene.start('MainMenu');
    });

    c.setDepth(50);
  }

  // ─── Tutorial ─────────────────────────────────────────────────────────────

  private showTutorial() {
    this.paused = true;
    const c = this.add.container(0, 0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    c.add(bg);

    const lines = [
      ['WELCOME TO BASH THE SILOS!', '28px', '#00d4ff'],
      ['', '12px', '#fff'],
      ['WASD / Arrows: Move', '18px', '#cceeee'],
      ['Space: Bash/Dash (smash blockers!)', '18px', '#cceeee'],
      ['E: Activate your Executive Ability', '18px', '#cceeee'],
      ['P / Esc: Pause', '18px', '#cceeee'],
      ['M: Mute', '18px', '#cceeee'],
      ['', '14px', '#fff'],
      ['Collect items to build your combo.', '16px', '#aaccdd'],
      ['Bash silos and blockers to clear the way.', '16px', '#aaccdd'],
      ['Fill the Transformation Meter for ONE FIRM MODE!', '16px', '#aaccdd'],
      ['Defeat the Silo Core boss near the end!', '16px', '#ffaa66'],
    ];

    let ty = GAME_HEIGHT / 2 - 200;
    lines.forEach(([text, size, col]) => {
      const t = this.add.text(GAME_WIDTH / 2, ty, text, {
        fontSize: size, fontFamily: 'system-ui, Arial, sans-serif',
        color: col, align: 'center',
      }).setOrigin(0.5);
      c.add(t);
      ty += parseInt(size) + 6;
    });

    const startY = ty + 20;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x003366, 0.9);
    btnBg.fillRoundedRect(GAME_WIDTH / 2 - 130, startY - 22, 260, 44, 8);
    btnBg.lineStyle(2, 0x00d4ff, 0.9);
    btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 130, startY - 22, 260, 44, 8);
    const btnLabel = this.add.text(GAME_WIDTH / 2, startY, "Let's Bash Some Silos!", {
      fontSize: '18px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    const zone = this.add.zone(GAME_WIDTH / 2, startY, 260, 44).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => {
      c.destroy();
      this.paused = false;
      localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, '1');
    });
    c.add([btnBg, btnLabel, zone]);
    c.setDepth(60);
  }

  // ─── Main Update ──────────────────────────────────────────────────────────

  update(time: number, delta: number) {
    if (this.paused) return;

    const dt = delta / 1000;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endGame();
      return;
    }

    // Surge
    if (!this.surgeActive && this.timeLeft <= SURGE_START) {
      this.surgeActive = true;
      audioManager.setSurgeMode(true);
      this.showPopup(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 - 80, 'TRANSFORMATION SURGE!', '#ff4400', '28px');
    }

    // Boss spawn
    if (!this.bossSpawned && this.timeLeft <= SURGE_START - 5) {
      this.spawnBoss();
    }

    // Player movement
    this.updatePlayer(dt);

    // Entities
    this.updateEntities(dt);

    // Spawn
    this.updateSpawner(dt);

    // Collision
    this.checkCollisions();

    // One Firm
    this.tryTriggerOneFirm();

    // Allies
    this.updateAllies(dt);

    // Power-ups
    this.updatePowerups(dt);

    // Particles
    this.updateParticles(dt);

    // Screenshake
    this.updateShake(dt);

    // Popups
    this.updatePopups(dt);

    // HUD
    this.updateHud();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const hudLeft = GAME_WIDTH - 220;

    // Timers
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.abilityCooldown > 0) p.abilityCooldown -= dt;
    if (p.invincibleTimer > 0) {
      p.invincibleTimer -= dt;
      if (p.invincibleTimer <= 0) p.invincible = false;
    }
    if (p.slowTimer > 0) {
      p.slowTimer -= dt;
      if (p.slowTimer <= 0) p.slow = 0;
    }

    // Ability timer
    if (p.abilityActive) {
      p.abilityTimer -= dt;
      if (p.abilityTimer <= 0) {
        p.abilityActive = false;
        if (this.executive.id === 'jason') this.scoreManager.freezeComboDecay(false);
        if (this.executive.id === 'johan') {
          p.invincible = false;
          p.invincibleTimer = 0;
        }
      }
    }

    // Charge ability
    const chargeRate = 4 * dt; // ~25s to full charge at rest
    if (!p.abilityActive && p.abilityCooldown <= 0) {
      p.abilityCharge = Math.min(100, p.abilityCharge + chargeRate);
    }

    // Dash
    if (p.dashing) {
      p.dashTimer -= dt;
      if (p.dashTimer <= 0) {
        p.dashing = false;
        p.vx = 0;
        p.vy = 0;
      }
    } else {
      // Movement input
      let ix = 0, iy = 0;

      if (this.touchActive && this.joystickActive) {
        ix = this.touchDir.x;
        iy = this.touchDir.y;
      } else {
        if (this.isKeyDown('left') || this.isKeyDown('a')) ix -= 1;
        if (this.isKeyDown('right') || this.isKeyDown('d')) ix += 1;
        if (this.isKeyDown('up') || this.isKeyDown('w')) iy -= 1;
        if (this.isKeyDown('down') || this.isKeyDown('s')) iy += 1;
      }

      const len = Math.sqrt(ix * ix + iy * iy);
      if (len > 0) {
        ix /= len; iy /= len;
        p.dashDir = { x: ix, y: iy };
      }

      const speedMod = (p.slow > 0 ? p.slow : 1) *
                       (this.hasPowerup('ai_accelerator') ? 1.4 : 1) *
                       (this.oneFirmActive ? 1.2 : 1);
      const speed = p.speed * speedMod;

      p.vx = ix * speed;
      p.vy = iy * speed;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Bounds
    p.x = Math.max(20, Math.min(hudLeft - 20, p.x));
    p.y = Math.max(20, Math.min(GAME_HEIGHT - 20, p.y));

    // Trail
    if (p.vx !== 0 || p.vy !== 0) {
      this.playerTrail.unshift({ x: p.x, y: p.y, alpha: 0.6 });
      if (this.playerTrail.length > 12) this.playerTrail.pop();
    }

    this.drawPlayer();
  }

  private updateEntities(dt: number) {
    const hudLeft = GAME_WIDTH - 220;
    this.entities.forEach((e) => {
      e.age += dt;

      if (e.type === 'blocker' || e.type === 'boss') {
        // Slow down blockers during Luke's ability
        const slowFactor = (this.player.abilityActive && this.executive.id === 'luke') ? 0.3 : 1;
        e.x += e.vx * dt * slowFactor;
        e.y += e.vy * dt * slowFactor;

        // Scope creep grows
        if ((e.data as BlockerDef).type === 'scope_creep' && e.age > 5) {
          e.radius = Math.min(45, e.radius + 0.5 * dt);
        }

        // Boss targets player slowly
        if (e.type === 'boss') {
          const dx = this.player.x - e.x, dy = this.player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 80) {
            e.vx += (dx / dist) * 20 * dt;
            e.vy += (dy / dist) * 20 * dt;
          }
          // Boss spawns hazards occasionally
          if (Math.floor(e.age * 10) % 60 === 0) {
            if (Math.random() < 0.3) this.spawnBlocker('hype_cloud');
            if (Math.random() < 0.3) this.spawnBlocker('scope_creep');
          }
        }

        // Bounce
        if (e.x < e.radius) { e.x = e.radius; e.vx = Math.abs(e.vx); }
        if (e.x > hudLeft - e.radius) { e.x = hudLeft - e.radius; e.vx = -Math.abs(e.vx); }
        if (e.y < e.radius) { e.y = e.radius; e.vy = Math.abs(e.vy); }
        if (e.y > GAME_HEIGHT - e.radius) { e.y = GAME_HEIGHT - e.radius; e.vy = -Math.abs(e.vy); }
      }

      // Collectibles float / pulse (no movement needed, just age)

      // Expire old collectibles
      if (e.type === 'collectible' && e.age > 18) {
        this.removeEntity(e);
        return;
      }
      if (e.type === 'powerup' && e.age > 12) {
        this.removeEntity(e);
        return;
      }
      if (e.type === 'client' && e.age > 15) {
        this.removeEntity(e);
        return;
      }

      this.drawEntity(e);
    });
  }

  private updateSpawner(dt: number) {
    // Accelerate
    this.accelerateTimer += dt;
    if (this.accelerateTimer >= 10) {
      this.accelerateTimer = 0;
      this.spawnInterval = Math.max(SPAWN_INTERVAL_MIN, this.spawnInterval - SPAWN_ACCELERATE_RATE);
    }

    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const r = Math.random();

      if (r < 0.40) {
        this.spawnCollectible();
      } else if (r < 0.62) {
        this.spawnBlocker();
      } else if (r < 0.75) {
        this.spawnClientBadge();
      } else if (r < 0.88) {
        this.spawnPowerup();
      } else {
        // Extra variety
        if (Math.random() < 0.5) this.spawnCollectible('qualified_opp');
        else this.spawnBlocker('margin_leak');
      }
    }
  }

  private endGame() {
    if (this.scene.isActive('Results')) return;
    this.scoreManager.saveHighScore();
    audioManager.stopMusic();

    const state = this.scoreManager.getState();
    const missionsDone = this.missionManager.getMissions().filter((m) => m.completed).length;

    this.cameras.main.fadeOut(800, 5, 15, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Results', {
        score: state.total,
        combo: state.highCombo,
        clients: state.clientsCollected,
        opps: state.qualifiedOpps,
        silos: state.silosBusted,
        crossPillar: state.crossPillarCombos,
        missions: missionsDone,
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
