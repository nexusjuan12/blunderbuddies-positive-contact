import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

export interface ResultData {
  won: boolean;
  score: number;
}

/** Stage clear / game over screen. Any input restarts the level. */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    this.cameras.main.setBackgroundColor(data.won ? '#2a6a3a' : '#2a1030');
    const style = { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold', color: '#ffffff', align: 'center' };

    this.add
      .text(GAME_WIDTH / 2, 170, data.won ? 'STAGE CLEAR!' : 'GAME OVER', { ...style, fontSize: '64px', color: '#ffe14d', stroke: '#000000', strokeThickness: 8 })
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 270, `Score  ${data.score}`, { ...style, fontSize: '32px' }).setOrigin(0.5);
    const prompt = this.add.text(GAME_WIDTH / 2, 390, 'Tap or press any key to play again', { ...style, fontSize: '22px' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    // Short delay so a held key or finger from gameplay doesn't instantly restart.
    this.time.delayedCall(800, () => {
      const again = () => this.scene.start('HappyHills');
      this.input.once(Phaser.Input.Events.POINTER_UP, again);
      this.input.keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, again);
      this.input.gamepad?.once(Phaser.Input.Gamepad.Events.BUTTON_DOWN, again);
    });
  }
}
