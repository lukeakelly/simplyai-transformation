import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, STORAGE_KEYS } from '../config';
import { EXECUTIVES, Executive } from '../../content/executives';
import { audioManager } from '../../systems/AudioManager';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private detailPanel!: Phaser.GameObjects.Container;
  private confirmBtn!: { g: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };

  constructor() {
    super({ key: 'CharacterSelect' });
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

    // Title
    this.add.text(GAME_WIDTH / 2, 38, 'CHOOSE YOUR EXECUTIVE', {
      fontSize: '28px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#00d4ff',
      stroke: '#001122', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 72, 'Each executive brings a unique ability to the transformation.', {
      fontSize: '14px', fontFamily: 'system-ui, Arial, sans-serif',
      color: '#667788',
    }).setOrigin(0.5);

    // Cards
    const cardW = 150, cardH = 195;
    const totalW = EXECUTIVES.length * (cardW + 14) - 14;
    const startX = GAME_WIDTH / 2 - totalW / 2;

    EXECUTIVES.forEach((exec, i) => {
      const x = startX + i * (cardW + 14) + cardW / 2;
      const y = 200;
      const card = this.makeCard(exec, x, y, cardW, cardH, i);
      this.cards.push(card);
    });

    // Detail panel
    this.detailPanel = this.add.container(0, 0);
    this.updateDetail(this.selectedIndex);

    // Confirm button
    this.confirmBtn = this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT - 55, 'Start Transformation!', 0x00d4ff, 0x003366, () => {
      audioManager.playSfx('ui_click');
      const exec = EXECUTIVES[this.selectedIndex];
      try { localStorage.setItem(STORAGE_KEYS.PREF_EXEC, exec.id); } catch { /* ignore */ }
      this.cameras.main.fadeOut(400, 5, 15, 26);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { executiveId: exec.id });
      });
    }, 280, 48);

    // Back button
    this.makeButton(80, GAME_HEIGHT - 55, '← Back', 0x334455, 0x111122, () => {
      audioManager.playSfx('ui_click');
      this.scene.start('MainMenu');
    }, 120, 40);

    // Keyboard nav
    const cursors = this.input.keyboard?.addKeys({
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      a:     Phaser.Input.Keyboard.KeyCodes.A,
      d:     Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    if (cursors) {
      this.input.keyboard?.on('keydown-LEFT', () => this.navigate(-1));
      this.input.keyboard?.on('keydown-RIGHT', () => this.navigate(1));
      this.input.keyboard?.on('keydown-A', () => this.navigate(-1));
      this.input.keyboard?.on('keydown-D', () => this.navigate(1));
      this.input.keyboard?.on('keydown-ENTER', () => this.confirmBtn.zone.emit('pointerdown'));
    }

    this.selectCard(0);
  }

  private makeCard(exec: Executive, x: number, y: number, w: number, h: number, index: number) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    container.add(bg);

    const drawCard = (selected: boolean, hovered: boolean) => {
      bg.clear();
      const alpha = hovered ? 0.35 : selected ? 0.28 : 0.12;
      bg.fillStyle(exec.colour, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      bg.lineStyle(selected ? 3 : 1, exec.colour, selected ? 1 : 0.4);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    };

    drawCard(false, false);

    // Avatar
    const avatar = this.drawAvatar(exec, 0, -30, 44);
    container.add(avatar);

    // Initials
    const initials = this.add.text(0, -30, exec.initials, {
      fontSize: '22px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);
    container.add(initials);

    // Name
    const nameText = this.add.text(0, 22, exec.name, {
      fontSize: '16px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: `#${exec.accentColour.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    container.add(nameText);

    // Title
    const titleText = this.add.text(0, 44, exec.title, {
      fontSize: '9px', fontFamily: 'system-ui, Arial, sans-serif',
      color: '#aabbcc', wordWrap: { width: w - 16 }, align: 'center',
    }).setOrigin(0.5);
    container.add(titleText);

    // Ability name
    const abilityText = this.add.text(0, 75, exec.ability.name, {
      fontSize: '10px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold',
      color: `#${exec.accentColour.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
    container.add(abilityText);

    // Hit zone
    const zone = this.add.zone(0, 0, w, h).setInteractive({ cursor: 'pointer' });
    container.add(zone);

    zone.on('pointerover', () => {
      drawCard(this.selectedIndex === index, true);
      audioManager.playSfx('ui_hover');
    });
    zone.on('pointerout', () => {
      drawCard(this.selectedIndex === index, false);
    });
    zone.on('pointerdown', () => {
      this.selectCard(index);
      audioManager.playSfx('ui_click');
    });

    (container as any)._drawCard = drawCard;
    (container as any)._index = index;

    return container;
  }

  private drawAvatar(exec: Executive, x: number, y: number, r: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    // Outer glow
    g.fillStyle(exec.colour, 0.15);
    g.fillCircle(x, y, r + 8);
    // Main circle
    g.fillStyle(exec.colour, 0.7);
    g.fillCircle(x, y, r);
    // Inner highlight
    g.fillStyle(exec.accentColour, 0.3);
    g.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.5);
    // Motif lines
    this.drawMotif(g, exec.motif, x, y, r * 0.55, exec.accentColour);
    return g;
  }

  private drawMotif(g: Phaser.GameObjects.Graphics, motif: string, x: number, y: number, r: number, colour: number) {
    g.lineStyle(2, colour, 0.9);
    switch (motif) {
      case 'compass':
        g.strokeCircle(x, y, r * 0.8);
        g.lineBetween(x, y - r, x, y + r);
        g.lineBetween(x - r, y, x + r, y);
        break;
      case 'arrow':
        g.lineBetween(x - r, y, x + r, y);
        g.lineBetween(x + r, y, x + r * 0.5, y - r * 0.5);
        g.lineBetween(x + r, y, x + r * 0.5, y + r * 0.5);
        break;
      case 'gears':
        g.strokeCircle(x, y, r * 0.7);
        g.strokeCircle(x + r * 0.5, y + r * 0.5, r * 0.4);
        break;
      case 'shield':
        g.beginPath();
        g.moveTo(x, y - r);
        g.lineTo(x + r, y - r * 0.3);
        g.lineTo(x + r, y + r * 0.3);
        g.lineTo(x, y + r);
        g.lineTo(x - r, y + r * 0.3);
        g.lineTo(x - r, y - r * 0.3);
        g.closePath();
        g.strokePath();
        break;
      case 'spark':
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.lineBetween(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        break;
      case 'ledger':
        for (let i = -1; i <= 1; i++) {
          g.lineBetween(x - r, y + i * r * 0.4, x + r, y + i * r * 0.4);
        }
        g.lineBetween(x - r * 0.4, y - r, x - r * 0.4, y + r);
        break;
    }
  }

  private navigate(dir: number) {
    const next = (this.selectedIndex + dir + EXECUTIVES.length) % EXECUTIVES.length;
    this.selectCard(next);
    audioManager.playSfx('ui_hover');
  }

  private selectCard(index: number) {
    const prev = this.selectedIndex;
    this.selectedIndex = index;

    // Update card visuals
    this.cards.forEach((card, i) => {
      const drawCard = (card as any)._drawCard;
      if (drawCard) drawCard(i === index, false);
      // Scale
      this.tweens.add({
        targets: card,
        scaleX: i === index ? 1.08 : 1,
        scaleY: i === index ? 1.08 : 1,
        duration: 180,
        ease: 'Back.easeOut',
      });
    });

    void prev;
    this.updateDetail(index);
  }

  private updateDetail(index: number) {
    this.detailPanel.removeAll(true);

    const exec = EXECUTIVES[index];
    const panelX = GAME_WIDTH / 2;
    const panelY = 430;
    const panelW = 820;
    const panelH = 170;

    const bg = this.add.graphics();
    bg.fillStyle(exec.colour, 0.1);
    bg.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 10);
    bg.lineStyle(1, exec.colour, 0.5);
    bg.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 10);
    this.detailPanel.add(bg);

    // Avatar
    const avatar = this.drawAvatar(exec, panelX - panelW / 2 + 65, panelY, 42);
    this.detailPanel.add(avatar);

    // Callout
    const callout = this.add.text(panelX - panelW / 2 + 130, panelY - 50, `"${exec.callout}"`, {
      fontSize: '15px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'italic', color: `#${exec.accentColour.toString(16).padStart(6, '0')}`,
    });
    this.detailPanel.add(callout);

    // Ability name
    const abilityTitle = this.add.text(panelX - panelW / 2 + 130, panelY - 22, `ABILITY: ${exec.ability.name}`, {
      fontSize: '16px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    });
    this.detailPanel.add(abilityTitle);

    // Ability desc
    const abilityDesc = this.add.text(panelX - panelW / 2 + 130, panelY + 8, exec.ability.description, {
      fontSize: '12px', fontFamily: 'system-ui, Arial, sans-serif',
      color: '#aabbcc', wordWrap: { width: panelW - 200 },
    });
    this.detailPanel.add(abilityDesc);

    // Stats
    const statX = panelX + panelW / 2 - 160;
    const statY = panelY - 48;
    const stats = [
      { label: 'Speed', value: exec.speed },
      { label: 'Bash Power', value: exec.bashPower },
      { label: 'Combo Window', value: exec.comboWindow / 1000 },
    ];
    stats.forEach((s, i) => {
      const lbl = this.add.text(statX, statY + i * 28, s.label, {
        fontSize: '11px', fontFamily: 'system-ui, Arial, sans-serif', color: '#667788',
      });
      const barW = 100;
      const barFill = Math.min(1, s.value / (i === 2 ? 5 : 1.3));
      const barBg = this.add.graphics();
      barBg.fillStyle(0x223344, 1);
      barBg.fillRoundedRect(statX + 90, statY + i * 28 + 2, barW, 12, 4);
      barBg.fillStyle(exec.colour, 0.8);
      barBg.fillRoundedRect(statX + 90, statY + i * 28 + 2, barW * barFill, 12, 4);
      this.detailPanel.add(lbl);
      this.detailPanel.add(barBg);
    });
  }

  private makeButton(
    x: number, y: number, text: string,
    colour: number, bg: number,
    onClick: () => void,
    width = 220, height = 42,
  ) {
    const g = this.add.graphics();
    const label = this.add.text(x, y, text, {
      fontSize: '16px', fontFamily: 'system-ui, Arial, sans-serif',
      fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5);

    const draw = (alpha = 1) => {
      g.clear();
      g.fillStyle(bg, alpha);
      g.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);
      g.lineStyle(2, colour, alpha);
      g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 8);
    };
    draw();

    const zone = this.add.zone(x, y, width, height).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => { draw(0.85); audioManager.playSfx('ui_hover'); });
    zone.on('pointerout', () => draw());
    zone.on('pointerdown', () => { audioManager.playSfx('ui_click'); onClick(); });
    return { g, label, zone };
  }
}
