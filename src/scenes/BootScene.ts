import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { NUH_UH } from '../data/heroes';
import { TITLE } from '../data/title';
import type { FlySheetMeta } from '../entities/Hero';
import { canvasTexture } from '../systems/canvasTexture';
import { TITLE_FONT } from './TitleScene';

const P = 'processed/';
const MASTER_VOLUME = 0.5;

/** Loads processed art/audio, draws placeholder textures for things without art yet, then waits for a tap. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const barW = 360;
    const frame = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, barW + 8, 22, 0x000000).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(frame.x - barW / 2, frame.y, 1, 14, 0xffd23f).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => (bar.width = barW * v));

    // The flight sheet's frame size lives in its JSON, so queue the sheet once that has loaded.
    this.load.json('hero-nuhuh-fly', `${P}hero-nuhuh-fly.json`);
    this.load.once('filecomplete-json-hero-nuhuh-fly', (_key: string, _type: string, meta: FlySheetMeta) => {
      this.load.spritesheet('hero-nuhuh-fly', `${P}hero-nuhuh-fly.png`, { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
    });
    this.load.image('mimic-1', `${P}mimic-1.png`);
    this.load.image('mimic-2', `${P}mimic-2.png`);
    this.load.image('mimic-3', `${P}mimic-3.png`);
    this.load.image('sun', `${P}sun.png`);
    this.load.image('hh-sky', `${P}hh-sky.png`);
    this.load.image('hh-far', `${P}hh-far.png`);
    this.load.image('hh-near', `${P}hh-near.png`);
    this.load.image('hh-dome', `${P}hh-dome.png`);
    for (const part of ['body', 'head', 'leg-front', 'leg-back']) {
      this.load.image(`turkey-${part}`, `${P}turkey-${part}.png`);
    }
    this.load.json('turkey-rig', `${P}turkey-rig.json`);

    this.load.font(TITLE_FONT, `${P}pdark.ttf`);
    this.load.json('title-panels', `${P}title-panels.json`);
    this.load.image('title-bg', `${P}title-bg.png`);
    for (const panel of ['tl', 'tr', 'bl', 'br', 'c']) this.load.image(`title-${panel}`, `${P}title-${panel}.png`);
    this.load.audio('music-title', [`${P}music-title.ogg`, `${P}music-title.mp3`]);

    this.load.audio('music-happy-hills', [`${P}music-happy-hills.ogg`, `${P}music-happy-hills.mp3`]);
    this.load.audio('voice-nuhuh-hurt', `${P}voice-nuhuh-hurt.mp3`);
    this.load.audio('voice-nuhuh-defiant', `${P}voice-nuhuh-defiant.mp3`);
    this.load.audio('voice-uhuhno-taunt', `${P}voice-uhuhno-taunt.mp3`);
    this.load.audio('voice-uhuhno-defeat', `${P}voice-uhuhno-defeat.mp3`);
  }

  create(): void {
    // Master volume starts at 50%; individual sounds keep their own relative levels.
    this.sound.volume = MASTER_VOLUME;
    this.makePlaceholders();

    const fly = this.cache.json.get('hero-nuhuh-fly') as FlySheetMeta;
    this.anims.create({
      key: NUH_UH.flyAnim,
      frames: this.anims.generateFrameNumbers(NUH_UH.texture, { start: 0, end: fly.frames - 1 }),
      frameRate: fly.fps,
      repeat: -1,
    });

    this.showGate();
  }

  /** "Tap to begin" gate: browsers only allow audio after a tap, and the title is timed to its music. */
  private showGate(): void {
    this.cameras.main.setBackgroundColor(0x06051a);
    this.children.removeAll(true);
    const cq = GAME_WIDTH / 100;
    const k = 2;
    const fs = 2.6 * cq * k;
    const font = `800 ${fs}px "${TITLE_FONT}"`;
    const spacing = `${0.16 * fs}px`;
    const m = document.createElement('canvas').getContext('2d')!;
    m.font = font;
    m.letterSpacing = spacing;
    const tw = m.measureText(TITLE.gateText).width;
    const padX = 3.4 * cq * k;
    const padY = 1.4 * cq * k;
    const border = 0.25 * cq * k;
    const w = tw + padX * 2 + border * 2;
    const h = fs * 1.25 + padY * 2 + border * 2;
    canvasTexture(this, 'gate-button', w, h, (c) => {
      c.lineWidth = border;
      c.strokeStyle = 'rgba(255,255,255,.7)';
      c.beginPath();
      c.roundRect(border / 2, border / 2, w - border, h - border, (h - border) / 2);
      c.stroke();
      c.font = font;
      c.letterSpacing = spacing;
      c.textBaseline = 'middle';
      c.fillStyle = '#ffffff';
      c.fillText(TITLE.gateText, border + padX, h / 2);
    });
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'gate-button').setScale(1 / k);

    const start = () => this.scene.start('Title');
    this.input.once(Phaser.Input.Events.POINTER_UP, start);
    this.input.keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, start);
    this.input.gamepad?.once(Phaser.Input.Gamepad.Events.BUTTON_DOWN, start);
  }

  /** Simple generated textures for effects and bullets that have no art yet (see ASSETS_TODO.md). */
  private makePlaceholders(): void {
    this.canvas('star', 32, 32, (c) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 15 : 6.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        c.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
      }
      c.closePath();
      c.fillStyle = '#ffd23f';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#fff6c2';
      c.stroke();
    });

    this.glowBall('bullet', 20, '#ff2e9a', '#ffffff');
    this.glowBall('bullet-ring', 20, '#ff8a00', '#fff2c0');

    this.canvas('drumstick', 44, 22, (c) => {
      c.fillStyle = '#f3ead8';
      c.fillRect(2, 9, 16, 4);
      c.beginPath();
      c.arc(4, 8, 3.5, 0, Math.PI * 2);
      c.arc(4, 14, 3.5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(29, 11, 13, 9, 0, 0, Math.PI * 2);
      c.fillStyle = '#b5652b';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#ff3b3b';
      c.stroke();
    });

    this.canvas('spark', 16, 16, (c) => {
      const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 16, 16);
    });

    this.canvas('ring', 64, 64, (c) => {
      c.beginPath();
      c.arc(32, 32, 28, 0, Math.PI * 2);
      c.lineWidth = 5;
      c.strokeStyle = '#ffffff';
      c.stroke();
    });

    this.canvas('hitbox', 20, 20, (c) => {
      const g = c.createRadialGradient(10, 10, 0, 10, 10, 10);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,60,120,1)');
      g.addColorStop(1, 'rgba(255,60,120,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 20, 20);
    });

    this.canvas('pip', 12, 12, (c) => {
      c.beginPath();
      c.arc(6, 6, 5, 0, Math.PI * 2);
      c.fillStyle = '#ffffff';
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = '#1a2a40';
      c.stroke();
    });
  }

  private glowBall(key: string, size: number, color: string, core: string): void {
    this.canvas(key, size, size, (c) => {
      const h = size / 2;
      c.beginPath();
      c.arc(h, h, h - 1, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
      c.beginPath();
      c.arc(h, h, h * 0.5, 0, Math.PI * 2);
      c.fillStyle = core;
      c.fill();
    });
  }

  private canvas(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): void {
    if (!this.textures.exists(key)) canvasTexture(this, key, w, h, draw);
  }
}
