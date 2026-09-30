import Phaser from 'phaser';
import { asset, GAME_HEIGHT as H, GAME_WIDTH as W } from '../config';
import { CUTSCENES, type CutsceneId } from '../data/cutscenes';
import { pillTexture, UI_K } from '../systems/uiText';

export interface CutsceneData {
  key: CutsceneId;
  /** Scene to start when the video ends or is skipped, and the data to hand it. */
  next: string;
  nextData?: object;
}

/** Input is ignored briefly so the tap that led here can't skip the video. */
const SKIP_GUARD_MS = 500;

/** Plays a video cutscene, letterboxed to fit, with a Skip button. Streams the file on demand. */
export class CutsceneScene extends Phaser.Scene {
  private video: Phaser.GameObjects.Video | null = null;
  private done = false;
  private canSkip = false;
  private info!: CutsceneData;

  constructor() {
    super('Cutscene');
  }

  create(data: CutsceneData): void {
    this.info = data;
    this.done = false;
    this.canSkip = false;
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.sound.stopAll();

    const video = this.add.video(W / 2, H / 2);
    this.video = video;
    const fit = () => {
      const vw = video.width || W;
      const vh = video.height || H;
      video.setScale(Math.min(W / vw, H / vh));
    };
    video.on(Phaser.GameObjects.Events.VIDEO_CREATED, fit);
    video.on(Phaser.GameObjects.Events.VIDEO_METADATA, fit);
    video.on(Phaser.GameObjects.Events.VIDEO_COMPLETE, () => this.finish());
    video.on(Phaser.GameObjects.Events.VIDEO_ERROR, () => this.finish());
    video.on(Phaser.GameObjects.Events.VIDEO_UNSUPPORTED, () => this.finish());
    video.loadURL(asset(CUTSCENES[data.key].file));
    // Follow the game's master volume (the video has its own audio track).
    video.setVolume(this.sound.volume);
    video.play();

    const skip = this.add
      .image(W - 16, H - 16, pillTexture(this, 'skip-button', 'SKIP', 1.5))
      .setOrigin(1, 1)
      .setScale(1 / UI_K)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });
    skip.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.trySkip());

    this.time.delayedCall(SKIP_GUARD_MS, () => (this.canSkip = true));
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyX') this.trySkip();
    });
    // Gamepad: A (0) or Start (9).
    this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 0 || button.index === 9) this.trySkip();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private trySkip(): void {
    if (this.canSkip) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.video?.stop();
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(this.info.next, this.info.nextData));
  }

  private cleanup(): void {
    this.video?.destroy();
    this.video = null;
  }
}
