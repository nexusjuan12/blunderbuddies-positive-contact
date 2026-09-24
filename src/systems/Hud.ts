import Phaser from 'phaser';
import { Debug, Depth, GAME_WIDTH } from '../config';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const PIP_GAP = 16;
const BAR_W = 420;
const BAR_H = 10;

/** Lives, shield pips, score, boss HP bar and banners. Updated on events, not every frame. */
export class Hud {
  private readonly lifeIcons: Phaser.GameObjects.Image[] = [];
  private readonly pips: Phaser.GameObjects.Image[] = [];
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly bossBarBack: Phaser.GameObjects.Rectangle;
  private readonly bossBar: Phaser.GameObjects.Rectangle;
  private readonly banner: Phaser.GameObjects.Text;
  private readonly fpsText: Phaser.GameObjects.Text | null;
  private fpsTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    heroTexture: string,
    maxLives: number,
    hitsPerLife: number,
  ) {
    for (let i = 0; i < maxLives; i++) {
      this.lifeIcons.push(
        scene.add.image(26 + i * 40, 24, heroTexture, 0).setScale(0.2).setDepth(Depth.Hud),
      );
    }
    for (let i = 0; i < hitsPerLife; i++) {
      this.pips.push(scene.add.image(18 + i * PIP_GAP, 50, 'pip').setDepth(Depth.Hud));
    }

    this.scoreText = scene.add
      .text(GAME_WIDTH - 16, 12, '0', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff', stroke: '#3a1a5a', strokeThickness: 5 })
      .setOrigin(1, 0)
      .setDepth(Depth.Hud);

    const bx = (GAME_WIDTH - BAR_W) / 2;
    this.bossBarBack = scene.add.rectangle(bx - 3, 16, BAR_W + 6, BAR_H + 6, 0x2a1030, 0.85).setOrigin(0, 0).setDepth(Depth.Hud).setVisible(false);
    this.bossBar = scene.add.rectangle(bx, 19, BAR_W, BAR_H, 0xff5577).setOrigin(0, 0).setDepth(Depth.Hud).setVisible(false);

    this.banner = scene.add
      .text(GAME_WIDTH / 2, 230, '', { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: '#ffe14d', stroke: '#6a1030', strokeThickness: 8, align: 'center' })
      .setOrigin(0.5)
      .setDepth(Depth.Hud)
      .setVisible(false);

    this.fpsText = Debug.showFps
      ? scene.add.text(8, 520, '', { fontFamily: 'monospace', fontSize: '12px', color: '#00ff88' }).setDepth(Depth.Hud)
      : null;
  }

  setLives(lives: number, hitsLeft: number): void {
    for (let i = 0; i < this.lifeIcons.length; i++) this.lifeIcons[i].setVisible(i < lives);
    for (let i = 0; i < this.pips.length; i++) {
      const on = lives > 0 && i < hitsLeft;
      this.pips[i].setTint(on ? 0x7fe0ff : 0x444444).setAlpha(on ? 1 : 0.5);
    }
  }

  setScore(score: number): void {
    this.scoreText.setText(String(score));
  }

  showBossBar(visible: boolean): void {
    this.bossBarBack.setVisible(visible);
    this.bossBar.setVisible(visible);
  }

  setBossHp(fraction: number): void {
    this.bossBar.scaleX = Math.max(0, fraction);
  }

  /** Flashing centre banner. `duration` 0 keeps it up until hidden. */
  showBanner(text: string, duration: number, color = '#ffe14d'): void {
    const b = this.banner;
    this.scene.tweens.killTweensOf(b);
    b.setText(text).setColor(color).setVisible(true).setAlpha(1).setScale(1);
    this.scene.tweens.add({ targets: b, alpha: 0.35, duration: 220, yoyo: true, repeat: -1 });
    if (duration > 0) this.scene.time.delayedCall(duration * 1000, () => this.hideBanner());
  }

  hideBanner(): void {
    this.scene.tweens.killTweensOf(this.banner);
    this.banner.setVisible(false);
  }

  update(dt: number): void {
    if (!this.fpsText) return;
    this.fpsTimer -= dt;
    if (this.fpsTimer <= 0) {
      this.fpsTimer = 0.5;
      this.fpsText.setText(`${this.scene.game.loop.actualFps.toFixed(0)} fps`);
    }
  }
}
