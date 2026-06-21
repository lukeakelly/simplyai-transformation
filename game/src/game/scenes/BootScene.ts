import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Generate all assets programmatically — no external files required
    this.createTextures();
  }

  private createTextures() {
    // Player avatar base (circle)
    this.generateCircleTexture('player_base', 24, 0x00d4ff, 0x0066ff);

    // Collectible shapes
    this.generateDiamondTexture('collectible_diamond', 16, 0xffcc00);
    this.generateCircleTexture('collectible_circle', 14, 0x00d4ff, 0x0044aa);
    this.generateStarTexture('collectible_star', 16, 0xffaa00);
    this.generateHexTexture('collectible_hex', 16, 0x00aaff);
    this.generateSquareTexture('collectible_square', 16, 0x00cc77);

    // Blocker shapes
    this.generateBlockerTexture('blocker_silo', 28, 0x444466, 0x333355);
    this.generateBlockerTexture('blocker_generic', 20, 0x885544, 0x664433);
    this.generateCubeTexture('blocker_cube', 30, 0x553333);

    // Boss
    this.generateBossTexture('boss_core', 80);

    // Power-up
    this.generateGlowTexture('powerup', 18, 0xffffff);

    // Client badge
    this.generateClientBadgeTexture('client_badge', 20);

    // Particles
    this.generateParticleTexture('particle_dot', 4, 0xffffff);
    this.generateParticleTexture('particle_spark', 3, 0xffaa00);
    this.generateParticleTexture('particle_trail', 3, 0x00d4ff);
    this.generateParticleTexture('particle_impact', 5, 0xff6600);
    this.generateParticleTexture('particle_star', 4, 0xffff00);

    // Background tiles
    this.generateBgTile('bg_data', 0x020d1a, 0x00d4ff);
    this.generateBgTile('bg_agentic', 0x1a0800, 0xff6b35);
    this.generateBgTile('bg_cloud', 0x001a2a, 0x33ccff);
    this.generateBgTile('bg_innovation', 0x1a0010, 0xff33aa);

    // UI elements
    this.generateCircleTexture('ability_ring', 36, 0x00d4ff, 0x0066ff);
    this.generateGlowTexture('glow_pulse', 64, 0x00d4ff);
  }

  private generateCircleTexture(key: string, r: number, fill: number, stroke?: number) {
    const g = this.add.graphics();
    g.clear();
    if (stroke !== undefined) {
      g.lineStyle(2, stroke, 0.8);
    }
    g.fillStyle(fill, 1);
    g.fillCircle(r, r, r);
    if (stroke !== undefined) g.strokeCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateDiamondTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    g.fillStyle(colour, 1);
    g.beginPath();
    g.moveTo(r, 0);
    g.lineTo(r * 2, r);
    g.lineTo(r, r * 2);
    g.lineTo(0, r);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateStarTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    g.fillStyle(colour, 1);
    const cx = r, cy = r;
    const points: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      points.push(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
    }
    g.fillPoints(points.reduce((acc: Phaser.Geom.Point[], _, i) => {
      if (i % 2 === 0) acc.push(new Phaser.Geom.Point(points[i], points[i + 1]));
      return acc;
    }, []), true);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateHexTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    g.fillStyle(colour, 1);
    const cx = r, cy = r;
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
      pts.push(new Phaser.Geom.Point(cx + Math.cos(angle) * r * 0.9, cy + Math.sin(angle) * r * 0.9));
    }
    g.fillPoints(pts, true);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateSquareTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    g.fillStyle(colour, 1);
    const size = r * 1.6;
    g.fillRect(r - size / 2, r - size / 2, size, size);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateBlockerTexture(key: string, r: number, fill: number, edge: number) {
    const g = this.add.graphics();
    g.fillStyle(fill, 1);
    const size = r * 1.7;
    g.fillRect(r - size / 2, r - size / 2, size, size);
    g.lineStyle(2, edge, 1);
    g.strokeRect(r - size / 2, r - size / 2, size, size);
    g.lineStyle(1, edge, 0.5);
    g.lineBetween(r - size / 2, r, r + size / 2, r);
    g.lineBetween(r, r - size / 2, r, r + size / 2);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateCubeTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    const h = Math.round(r * 0.6);
    // top face
    g.fillStyle(Phaser.Display.Color.IntegerToColor(colour).lighten(30).color, 1);
    g.beginPath();
    g.moveTo(r, 2);
    g.lineTo(r * 2 - 2, 2 + h);
    g.lineTo(r, 2 + h * 2);
    g.lineTo(2, 2 + h);
    g.closePath();
    g.fillPath();
    // left face
    g.fillStyle(colour, 1);
    g.beginPath();
    g.moveTo(2, 2 + h);
    g.lineTo(r, 2 + h * 2);
    g.lineTo(r, r * 2 - 2);
    g.lineTo(2, r * 2 - 2 - h);
    g.closePath();
    g.fillPath();
    // right face
    g.fillStyle(Phaser.Display.Color.IntegerToColor(colour).darken(20).color, 1);
    g.beginPath();
    g.moveTo(r, 2 + h * 2);
    g.lineTo(r * 2 - 2, 2 + h);
    g.lineTo(r * 2 - 2, r * 2 - 2 - h);
    g.lineTo(r, r * 2 - 2);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateBossTexture(key: string, size: number) {
    const g = this.add.graphics();
    const h = size;
    const c = h / 2;
    const faceCols = [0x00d4ff, 0xff6b35, 0x33ccff, 0xff33aa];
    // Quadrant faces
    for (let i = 0; i < 4; i++) {
      g.fillStyle(faceCols[i], 0.85);
      const qx = (i % 2) * c;
      const qy = Math.floor(i / 2) * c;
      g.fillRect(qx, qy, c, c);
      g.lineStyle(2, 0x000000, 0.5);
      g.strokeRect(qx, qy, c, c);
    }
    // Core
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(c, c, c * 0.3);
    g.lineStyle(3, 0xffffff, 0.8);
    g.strokeCircle(c, c, c * 0.3);
    g.generateTexture(key, h, h);
    g.destroy();
  }

  private generateParticleTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    g.fillStyle(colour, 1);
    g.fillCircle(r, r, r);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateGlowTexture(key: string, r: number, colour: number) {
    const g = this.add.graphics();
    // Radial gradient approximation
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const alpha = (1 - t) * 0.6;
      const rad = r * (1 - t * 0.8);
      g.fillStyle(colour, alpha);
      g.fillCircle(r, r, rad);
    }
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  private generateBgTile(key: string, bg: number, accent: number) {
    const size = 128;
    const g = this.add.graphics();
    g.fillStyle(bg, 1);
    g.fillRect(0, 0, size, size);
    g.lineStyle(1, accent, 0.06);
    for (let i = 0; i <= size; i += 32) {
      g.lineBetween(i, 0, i, size);
      g.lineBetween(0, i, size, i);
    }
    // Dot at intersections
    g.fillStyle(accent, 0.12);
    for (let x = 32; x < size; x += 32) {
      for (let y = 32; y < size; y += 32) {
        g.fillCircle(x, y, 2);
      }
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private generateClientBadgeTexture(key: string, r: number) {
    const g = this.add.graphics();
    g.fillStyle(0x1144aa, 1);
    g.fillRoundedRect(0, 0, r * 2, r * 2, 4);
    g.lineStyle(1, 0x3366ff, 1);
    g.strokeRoundedRect(0, 0, r * 2, r * 2, 4);
    g.generateTexture(key, r * 2, r * 2);
    g.destroy();
  }

  create() {
    this.scene.start('MainMenu');
  }
}
