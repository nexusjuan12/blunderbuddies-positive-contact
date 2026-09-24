import Phaser from 'phaser';
import { GAME_HEIGHT as H, GAME_WIDTH as W } from '../config';
import type { HeroId } from '../data/heroes';
import { headingTexture, pillTexture, UI_K } from '../systems/uiText';

export interface ResultData {
  won: boolean;
  score: number;
  hero: HeroId;
}

/** Stage clear / game over. "Play again" restarts with the same Buddy; "Choose Buddy" returns to select. */
export class ResultScene extends Phaser.Scene {
  private buttons: Phaser.GameObjects.Image[] = [];
  private focus = 0;
  private result!: ResultData;
  private ready = false;

  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.result = data;
    this.ready = false;
    this.focus = 0;
    this.cameras.main.setBackgroundColor(data.won ? '#123a24' : '#1e0b2a');

    this.add
      .image(W / 2, H * 0.3, headingTexture(this, 'result-title', data.won ? 'STAGE CLEAR' : 'GAME OVER', 6.5, '#ffe14d', 'rgba(255,205,58,.6)'))
      .setScale(1 / UI_K);
    this.add
      .image(W / 2, H * 0.5, headingTexture(this, 'result-score', `SCORE  ${data.score}`, 3, '#ffffff', 'rgba(134,233,255,.6)'))
      .setScale(1 / UI_K);

    const labels = ['PLAY AGAIN', 'CHOOSE BUDDY'];
    this.buttons = labels.map((label, i) => {
      const b = this.add
        .image(W / 2 + (i === 0 ? -1 : 1) * 175, H * 0.74, pillTexture(this, `result-btn-${i}`, label, 2.2))
        .setScale(1 / UI_K)
        .setInteractive({ useHandCursor: true });
      b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.setFocus(i));
      b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.pick(i));
      return b;
    });
    this.setFocus(0);

    // Short delay so a held key or finger from gameplay doesn't pick something by accident.
    this.time.delayedCall(700, () => (this.ready = true));
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.setFocus(0);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.setFocus(1);
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyX' || e.code === 'NumpadEnter') this.pick(this.focus);
    });
    this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 14) this.setFocus(0);
      else if (button.index === 15) this.setFocus(1);
      else if (button.index === 0) this.pick(this.focus);
    });
  }

  private setFocus(i: number): void {
    this.focus = i;
    this.buttons.forEach((b, n) => {
      this.tweens.killTweensOf(b);
      b.setAlpha(n === i ? 1 : 0.55);
      this.tweens.add({ targets: b, scale: (n === i ? 1.08 : 1) / UI_K, duration: 150, ease: 'Sine.easeOut' });
    });
  }

  private pick(i: number): void {
    if (!this.ready) return;
    this.ready = false;
    if (i === 0) this.scene.start('HappyHills', { hero: this.result.hero });
    else this.scene.start('Title', { skipIntro: true });
  }
}
