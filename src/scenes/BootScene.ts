import Phaser from 'phaser';
import { asset, Debug, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { HERO_IDS, HEROES, isHeroId } from '../data/heroes';
import { TITLE } from '../data/title';
import type { FlySheetMeta } from '../entities/Hero';
import type { BunnyMeta } from '../entities/RoboBunny';
import { canvasTexture } from '../systems/canvasTexture';
import { flower, heart, RAINBOW, rainbow, star } from '../systems/shapes';
import { pillTexture, TITLE_FONT, UI_K } from '../systems/uiText';

const MASTER_VOLUME = 0.5;
/** Enemy sheets that simply loop: texture key = JSON key = animation key. */
const LOOP_SHEETS = ['mimic-1', 'mimic-2', 'mimic-3', 'elon-walk'];

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

    // Each flight sheet's frame size lives in its JSON, so queue the sheet once that has loaded.
    for (const id of HERO_IDS) {
      const h = HEROES[id];
      this.load.json(h.texture, asset(`${h.texture}.json`));
      this.load.once(`filecomplete-json-${h.texture}`, (_key: string, _type: string, meta: FlySheetMeta) => {
        this.load.spritesheet(h.texture, asset(`${h.texture}.png`), { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
      });
      this.load.image(h.superTexture, asset(`${h.superTexture}.png`));
      // Select-idle sheets are big; only their metadata loads now (TitleScene loads the sheet on demand).
      this.load.json(h.selectTexture, asset(`${h.selectTexture}.json`));
      for (const kind of ['select', 'damage', 'recover'] as const) {
        for (const key of h.voices[kind]) this.load.audio(key, asset(`${key}.mp3`));
      }
    }
    for (const key of LOOP_SHEETS) this.loadSheet(key);

    // Robo bunny (two sheets share one JSON), its eggs, and the escape-pod rider stand-in.
    this.load.json('bunny', asset(`bunny.json`));
    this.load.once('filecomplete-json-bunny', (_key: string, _type: string, meta: BunnyMeta) => {
      for (const name of ['walk', 'throw'] as const) {
        this.load.spritesheet(`bunny-${name}`, asset(`bunny-${name}.png`), { frameWidth: meta[name].frameWidth, frameHeight: meta[name].frameHeight });
      }
    });
    this.loadSheet('eggs');
    this.load.image('uhuhno-rider', asset(`uhuhno-rider.png`));
    this.load.image('sun', asset(`sun.png`));
    this.load.image('hh-sky', asset(`hh-sky.png`));
    this.load.image('hh-far', asset(`hh-far.png`));
    this.load.image('hh-near', asset(`hh-near.png`));
    this.load.image('hh-dome', asset(`hh-dome.png`));
    for (const part of ['body', 'head', 'leg-front', 'leg-back']) {
      this.load.image(`turkey-${part}`, asset(`turkey-${part}.png`));
    }
    this.load.json('turkey-rig', asset(`turkey-rig.json`));

    this.load.font(TITLE_FONT, asset(`pdark.ttf`));
    this.load.json('title-panels', asset(`title-panels.json`));
    this.load.image('title-bg', asset(`title-bg.png`));
    for (const panel of ['tl', 'tr', 'bl', 'br', 'c']) this.load.image(`title-${panel}`, asset(`title-${panel}.png`));
    this.load.audio('music-title', [asset(`music-title.ogg`), asset(`music-title.mp3`)]);

    this.load.audio('music-happy-hills', [asset(`music-happy-hills.ogg`), asset(`music-happy-hills.mp3`)]);
    this.load.audio('voice-uhuhno-taunt', asset(`voice-uhuhno-taunt.mp3`));
    this.load.audio('voice-uhuhno-defeat', asset(`voice-uhuhno-defeat.mp3`));
  }

  /** Queue a sprite sheet whose frame size lives in its JSON (`<key>.json` + `<key>.png`). */
  private loadSheet(key: string): void {
    this.load.json(key, asset(`${key}.json`));
    this.load.once(`filecomplete-json-${key}`, (_key: string, _type: string, meta: FlySheetMeta) => {
      this.load.spritesheet(key, asset(`${key}.png`), { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
    });
  }

  create(): void {
    // Master volume starts at 50%; individual sounds keep their own relative levels.
    this.sound.volume = MASTER_VOLUME;
    this.makePlaceholders();

    for (const id of HERO_IDS) {
      const h = HEROES[id];
      const fly = this.cache.json.get(h.texture) as FlySheetMeta;
      this.anims.create({
        key: h.flyAnim,
        frames: this.anims.generateFrameNumbers(h.texture, { start: 0, end: fly.frames - 1 }),
        frameRate: fly.fps,
        repeat: -1,
      });
    }

    for (const key of LOOP_SHEETS) {
      const meta = this.cache.json.get(key) as FlySheetMeta;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: meta.frames - 1 }),
        frameRate: meta.fps,
        repeat: -1,
      });
    }

    const bunny = this.cache.json.get('bunny') as BunnyMeta;
    this.anims.create({
      key: 'bunny-walk',
      frames: this.anims.generateFrameNumbers('bunny-walk', { start: 0, end: bunny.walk.frames - 1 }),
      frameRate: bunny.walk.fps,
      repeat: -1,
    });
    this.anims.create({
      key: 'bunny-throw',
      frames: this.anims.generateFrameNumbers('bunny-throw', { start: 0, end: bunny.throw.frames - 1 }),
      frameRate: bunny.throw.fps,
      repeat: 0,
    });

    this.showGate();
  }

  /** "Tap to begin" gate: browsers only allow audio after a tap, and the title is timed to its music. */
  private showGate(): void {
    this.cameras.main.setBackgroundColor(0x06051a);
    this.children.removeAll(true);
    pillTexture(this, 'gate-button', TITLE.gateText);
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'gate-button').setScale(1 / UI_K);

    const start = () => {
      if (isHeroId(Debug.hero)) this.scene.start('HappyHills', { hero: Debug.hero });
      else this.scene.start('Title');
    };
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

    // Nuh-Uh's stars: one per colour, with a soft glow and a bright edge.
    ['#ffd23f', '#ff6ec7', '#5fe0ff', '#9dff6a', '#b98cff'].forEach((col, i) =>
      this.canvas(`star-${i}`, 48, 48, (c) => {
        c.translate(24, 24);
        const g = c.createRadialGradient(0, 0, 4, 0, 0, 24);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 0.55;
        c.fillStyle = g;
        c.fillRect(-24, -24, 48, 48);
        c.globalAlpha = 1;
        star(c, 15, 0.45);
        c.fillStyle = col;
        c.fill();
        c.lineWidth = 2.5;
        c.strokeStyle = '#ffffff';
        c.stroke();
        star(c, 6, 0.45);
        c.fillStyle = 'rgba(255,255,255,.85)';
        c.fill();
      }),
    );

    // Hero projectiles and select-screen icons (Buddy motifs).
    this.canvas('heart', 32, 32, (c) => {
      c.translate(16, 17);
      heart(c, 13);
      c.fillStyle = '#ff4fa6';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#ffffff';
      c.stroke();
    });
    this.canvas('flower', 32, 32, (c) => {
      c.translate(16, 16);
      flower(c, 13, '#ff8fd0');
    });
    this.canvas('rainbow', 40, 32, (c) => {
      c.translate(20, 20);
      rainbow(c, 16);
    });
    ['#ff5fa2', '#ff9a2e', '#ffe23f', '#d23cff', '#3fa7ff'].forEach((col, i) =>
      this.canvas(`ball-${i}`, 26, 26, (c) => {
        c.beginPath();
        c.arc(13, 13, 10.5, 0, Math.PI * 2);
        c.fillStyle = col;
        c.fill();
        c.lineWidth = 2.5;
        c.strokeStyle = '#ffffff';
        c.stroke();
        c.beginPath();
        c.arc(9.5, 9, 3.2, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,.75)';
        c.fill();
      }),
    );
    // Beam: horizontal rainbow bands with soft top and bottom edges; tiled along x.
    this.canvas('beam', 64, 32, (c) => {
      const band = 32 / RAINBOW.length;
      RAINBOW.forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(0, i * band, 64, band + 0.5);
      });
      const g = c.createLinearGradient(0, 0, 0, 32);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 32);
      for (let x = 0; x < 64; x += 16) {
        c.fillStyle = 'rgba(255,255,255,.35)';
        c.fillRect(x, 0, 4, 32);
      }
      c.globalCompositeOperation = 'destination-in';
      const edge = c.createLinearGradient(0, 0, 0, 32);
      edge.addColorStop(0, 'rgba(0,0,0,0)');
      edge.addColorStop(0.2, 'rgba(0,0,0,1)');
      edge.addColorStop(0.8, 'rgba(0,0,0,1)');
      edge.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = edge;
      c.fillRect(0, 0, 64, 32);
    });

    // Placeholder clouds for the ascent (real cloud art wanted, see ASSETS_TODO.md).
    this.canvas('cloud', 220, 110, (c) => {
      const puffs: [number, number, number][] = [[60, 68, 34], [100, 50, 42], [145, 58, 36], [180, 72, 26], [35, 78, 22], [110, 78, 34]];
      c.fillStyle = 'rgba(190,210,240,.9)';
      for (const [x, y, r] of puffs) {
        c.beginPath();
        c.arc(x, y + 6, r, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#ffffff';
      for (const [x, y, r] of puffs) {
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    });
    // High-altitude sky: clear at the top, solid blue lower down (covers the ground-level haze band).
    this.canvas('ascent-sky', 8, 540, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 540);
      g.addColorStop(0, 'rgba(47,111,208,.15)');
      g.addColorStop(0.45, 'rgba(58,128,222,.8)');
      g.addColorStop(0.6, 'rgba(70,142,232,1)');
      g.addColorStop(1, 'rgba(120,180,245,1)');
      c.fillStyle = g;
      c.fillRect(0, 0, 8, 540);
    });
    this.canvas('cloud-sea', 512, 200, (c) => {
      const g = c.createLinearGradient(0, 40, 0, 200);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#c9dcf5');
      c.fillStyle = g;
      c.fillRect(0, 70, 512, 130);
      // Bumps repeat every 128 px so the strip tiles seamlessly.
      for (let x = 0; x <= 512; x += 64) {
        c.beginPath();
        c.arc(x, 72, x % 128 === 0 ? 44 : 32, 0, Math.PI * 2);
        c.fill();
      }
    });

    // On-screen Super (Positive Vibes Wave) button.
    this.canvas('super-button', 128, 128, (c) => {
      c.translate(64, 64);
      c.beginPath();
      c.arc(0, 0, 58, 0, Math.PI * 2);
      c.fillStyle = 'rgba(18,24,82,.55)';
      c.fill();
      RAINBOW.forEach((col, i) => {
        c.beginPath();
        c.arc(0, 0, 60 - i * 2.2, 0, Math.PI * 2);
        c.lineWidth = 2.4;
        c.strokeStyle = col;
        c.stroke();
      });
      heart(c, 30);
      c.fillStyle = '#ff4fa6';
      c.fill();
      c.lineWidth = 4;
      c.strokeStyle = '#ffffff';
      c.stroke();
    });

    // Team pickup: a glowing orb with the five Buddies' colours.
    this.canvas('team-pickup', 48, 48, (c) => {
      c.translate(24, 24);
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 22);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.55, 'rgba(255,225,120,.9)');
      g.addColorStop(1, 'rgba(255,160,220,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, 22, 0, Math.PI * 2);
      c.fill();
      ['#ff8a1c', '#ff4fa6', '#8a4dff', '#3fa7ff', '#4fdc6b'].forEach((col, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        c.beginPath();
        c.arc(Math.cos(a) * 11, Math.sin(a) * 11, 4.5, 0, Math.PI * 2);
        c.fillStyle = col;
        c.fill();
        c.lineWidth = 1.5;
        c.strokeStyle = '#ffffff';
        c.stroke();
      });
    });

    // Elon's lobbed web ball.
    this.canvas('web', 22, 22, (c) => {
      c.beginPath();
      c.arc(11, 11, 9, 0, Math.PI * 2);
      c.fillStyle = '#e8ecf5';
      c.fill();
      c.strokeStyle = '#6a7390';
      c.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 4;
        c.beginPath();
        c.moveTo(11 - Math.cos(a) * 9, 11 - Math.sin(a) * 9);
        c.lineTo(11 + Math.cos(a) * 9, 11 + Math.sin(a) * 9);
        c.stroke();
      }
      c.beginPath();
      c.arc(11, 11, 5, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = '#ff2e9a';
      c.beginPath();
      c.arc(11, 11, 9, 0, Math.PI * 2);
      c.stroke();
    });

    this.glowBall('bullet', 20, '#ff2e9a', '#ffffff');
    this.glowBall('bullet-big', 34, '#ff5a1f', '#fff2c0');
    this.glowBall('bullet-split', 26, '#ffc400', '#ffffff');
    // Pointed bullets are drawn facing right and rotated along their path.
    this.canvas('bullet-bolt', 30, 14, (c) => {
      c.beginPath();
      c.roundRect(1, 2, 28, 10, 5);
      c.fillStyle = '#b13cff';
      c.fill();
      c.beginPath();
      c.roundRect(7, 5, 16, 4, 2);
      c.fillStyle = '#ffffff';
      c.fill();
    });
    this.canvas('bullet-shard', 26, 14, (c) => {
      c.beginPath();
      c.moveTo(25, 7);
      c.lineTo(11, 1);
      c.lineTo(1, 7);
      c.lineTo(11, 13);
      c.closePath();
      c.fillStyle = '#18c8ff';
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = '#08306b';
      c.stroke();
      c.beginPath();
      c.moveTo(20, 7);
      c.lineTo(11, 4);
      c.lineTo(6, 7);
      c.lineTo(11, 10);
      c.closePath();
      c.fillStyle = '#ffffff';
      c.fill();
    });
    this.canvas('bullet-feather', 34, 14, (c) => {
      c.beginPath();
      c.moveTo(33, 7);
      c.quadraticCurveTo(18, -2, 3, 7);
      c.quadraticCurveTo(18, 16, 33, 7);
      c.fillStyle = '#ff7a1a';
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = '#6a1d00';
      c.stroke();
      c.beginPath();
      c.moveTo(4, 7);
      c.lineTo(30, 7);
      c.strokeStyle = '#fff2c0';
      c.stroke();
    });
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
