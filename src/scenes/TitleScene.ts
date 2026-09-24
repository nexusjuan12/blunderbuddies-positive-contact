import Phaser from 'phaser';
import { GAME_HEIGHT as H, GAME_WIDTH as W } from '../config';
import { TITLE } from '../data/title';
import { canvasTexture } from '../systems/canvasTexture';
import { cubicBezier, EASE, EASE_IN_OUT, EASE_OUT } from '../systems/easing';

/** Panel crop + pop origin from tools/process_assets.py, all 0..1 of the art box. */
interface PanelMeta {
  x: number;
  y: number;
  w: number;
  h: number;
  originX: number;
  originY: number;
}

export const TITLE_FONT = 'PerfectDark';

/** 1% of the stage width: the CSS `cqw` unit the original animation was written in. */
const CQ = W / 100;
/** Canvas text is drawn at 2x and displayed at 0.5 for crisp edges when scaled up. */
const K = 2;
/** The 4:3 collage sits in the middle 75% of the 16:9 stage. */
const ART_W = W * 0.75;
const ART_LEFT = (W - ART_W) / 2;
/** The art zooms around this point (fraction of the art box) while idle. */
const ART_PIVOT_Y = 0.42;
const SVG_W = 2304;
const SVG_H = 1728;

const COLORS = {
  void: 0x06051a,
  red: '#e3262f',
  navy: '#121852',
  navyDeep: '#0b0f38',
  gold: '#ffcd3a',
  chromeMid: '#a9b8dc',
  chromeLo: '#34437a',
};

const PANEL_ORDER = ['tl', 'tr', 'bl', 'br'] as const;

const LIGHT_EASE = cubicBezier(0.2, 0.7, 0.2, 1);
const DROP_EASE = cubicBezier(0.2, 1.5, 0.35, 1);
const DRAW_EASE = cubicBezier(0.4, 0, 0.2, 1);
const SHAKE_EASE = cubicBezier(0.3, 0.7, 0.4, 1);

const HEART_PATH =
  'M12 21s-7.5-4.6-9.6-9.2C.9 8.5 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 4 4.4 7.3C19.5 16.4 12 21 12 21z';
const STAR_PATH = 'M12 1.8l3 6.9 7.4.6-5.6 4.9 1.7 7.3L12 17.6l-6.5 3.9 1.7-7.3L1.6 9.3 9 8.7z';

interface Word {
  image: Phaser.GameObjects.Image;
  tex: Phaser.Textures.CanvasTexture;
  base: HTMLCanvasElement;
  glyphs: HTMLCanvasElement;
  /** Text box inside the canvas, for the sheen band. */
  boxLeft: number;
  boxWidth: number;
  boxTop: number;
  boxHeight: number;
  y: number;
  from: number;
}

const PARTICLE_KINDS = ['tp-heart', 'tp-star', 'tp-flower', 'tp-rainbow'] as const;
const PETALS = ['#ff8fd0', '#b98cff', '#8fe0ff', '#ffffff'];
/** Particle textures are drawn with a shape size of 20 (the original's `s`). */
const PARTICLE_BASE = 20;

class Particle {
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  rot = 0;
  vr = 0;
  size = 1;
  life = 0;
  max = 1;
  rainbow = false;
  constructor(readonly image: Phaser.GameObjects.Image) {}
}

/**
 * Title screen: searchlight sweep, roll call of the five helmet panels, frame lines, chrome logo,
 * particle burst and "tap to start". A tap during the intro skips to the finished state.
 */
export class TitleScene extends Phaser.Scene {
  private art!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Image;
  private panels: Record<string, { image: Phaser.GameObjects.Image; cm: Phaser.Filters.ColorMatrix }> = {};
  private search!: Phaser.GameObjects.Image;
  private frame!: Phaser.GameObjects.Graphics;
  private shade!: Phaser.GameObjects.Image;
  private flash!: Phaser.GameObjects.Rectangle;
  private words: Word[] = [];
  private sub!: Phaser.GameObjects.Image;
  private tap!: Phaser.GameObjects.Image;
  private particles: Particle[] = [];
  private sheenCanvas!: HTMLCanvasElement;

  private ready = false;
  private starting = false;
  private tweenTokens: Phaser.Tweens.Tween[] = [];

  constructor() {
    super('Title');
  }

  create(): void {
    this.ready = false;
    this.starting = false;
    this.words = [];
    this.particles = [];
    this.panels = {};
    this.tweenTokens = [];
    this.cameras.main.setBackgroundColor(COLORS.void);

    this.makeParticleTextures();

    this.bg = this.add.image(W / 2, H / 2, 'title-bg').setScale(2);
    this.setBgBrightness(0.1);

    this.art = this.add.container(ART_LEFT + ART_W / 2, H * ART_PIVOT_Y);
    const meta = this.cache.json.get('title-panels') as Record<string, PanelMeta>;
    for (const name of [...PANEL_ORDER, 'c']) {
      const m = meta[name];
      const image = this.add
        .image(this.artX(m.originX), this.artY(m.originY), `title-${name}`)
        .setOrigin((m.originX - m.x) / m.w, (m.originY - m.y) / m.h)
        .setScale(0.5);
      image.enableFilters();
      const cm = image.filters!.internal.addColorMatrix();
      this.art.add(image);
      this.panels[name] = { image, cm };
      this.setPanelLook(name, 0.1, 0.35);
    }
    this.frame = this.add.graphics();
    this.art.add(this.frame);
    this.makeSearchTexture();
    this.search = this.add.image(0, 0, 'title-search').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.art.add(this.search);

    this.makeShadeTexture();
    this.shade = this.add.image(0, 0, 'title-shade').setOrigin(0).setAlpha(0);

    for (let i = 0; i < 220; i++) {
      const img = this.add.image(-100, -100, 'tp-heart').setVisible(false);
      this.particles.push(new Particle(img));
    }

    this.buildLogo();
    this.flash = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tap = this.add.image(W / 2, H * 0.955 - 1.9 * CQ, this.textTexture('title-tap', TITLE.tapText, 2.2, 0.18, COLORS.gold, 'rgba(255,205,58,.55)', 1.6));
    this.tap.setScale(1 / K).setAlpha(0);

    this.sound.stopAll();
    if (this.cache.audio.exists(TITLE.music)) this.sound.play(TITLE.music, { loop: true });

    this.runTimeline();

    const onInput = () => this.onTap();
    this.input.on(Phaser.Input.Events.POINTER_UP, onInput);
    this.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, onInput);
    this.input.gamepad?.on(Phaser.Input.Gamepad.Events.BUTTON_DOWN, onInput);
  }

  // ---------------------------------------------------------------- timeline

  private runTimeline(): void {
    const at = (s: number, fn: () => void) => this.time.delayedCall(s * 1000, fn);
    const R = TITLE.reveal;

    this.sweepSearch(R);
    PANEL_ORDER.forEach((k, i) => at(R + i * TITLE.rollGap, () => this.lightPanel(k)));

    const C = R + 4 * TITLE.rollGap + TITLE.centerPause;
    at(C, () => {
      this.lightPanel('c');
      this.doFlash();
      this.drawFrame();
      this.lightBg();
      this.shake();
    });

    const L = C + TITLE.logoDelay;
    at(L, () => {
      this.fadeIn(this.shade, 900);
      this.dropWord(this.words[0]);
    });
    at(L + TITLE.wordGap, () => this.dropWord(this.words[1]));
    at(L + TITLE.wordGap + 0.5, () => {
      this.burst(TITLE.burstCount);
      this.shake();
    });
    at(L + TITLE.subDelay, () => {
      this.showSub();
      this.sheen();
    });
    at(L + TITLE.tapDelay, () => this.showTap());
  }

  private onTap(): void {
    if (this.starting) return;
    if (!this.ready) {
      this.skipToEnd();
      return;
    }
    this.starting = true;
    this.doFlash();
    this.burst(TITLE.tapBurstCount);
    this.time.delayedCall(TITLE.startDelay * 1000, () => {
      this.cameras.main.fadeOut(350, 6, 5, 26);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('HappyHills'));
    });
  }

  /** A tap during the intro jumps straight to the finished title. */
  private skipToEnd(): void {
    this.time.removeAllEvents();
    for (const t of this.tweenTokens) t.remove();
    this.tweenTokens = [];
    this.search.setAlpha(0);
    for (const name of Object.keys(this.panels)) {
      this.setPanelLook(name, 1, 1.05);
      this.panels[name].image.setScale(0.5);
    }
    this.drawFramePaths(1);
    this.setBgBrightness(0.38);
    this.shade.setAlpha(1);
    for (const w of this.words) w.image.setPosition(W / 2, w.y).setScale(1 / K).setAlpha(1);
    this.sub.setAlpha(1).setY(this.subY);
    this.showTap();
  }

  // ---------------------------------------------------------------- pieces

  private artX(u: number): number {
    return (u - 0.5) * ART_W;
  }

  private artY(v: number): number {
    return (v - ART_PIVOT_Y) * H;
  }

  private track(t: Phaser.Tweens.Tween): Phaser.Tweens.Tween {
    this.tweenTokens.push(t);
    return t;
  }

  /** Runs `apply(t)` with t going 0..1 over `ms`. */
  private animate(ms: number, apply: (t: number) => void, repeat = 0, yoyo = false): Phaser.Tweens.Tween {
    const state = { t: 0 };
    return this.track(
      this.tweens.add({
        targets: state,
        t: 1,
        duration: ms,
        ease: 'Linear',
        repeat,
        yoyo,
        onUpdate: () => apply(state.t),
        onComplete: () => apply(1),
      }),
    );
  }

  /** CSS-style keyframes: `ease` applies within each segment between keys. */
  private static keyframe(t: number, keys: readonly number[], values: readonly number[], ease: (t: number) => number): number {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i]) {
        const local = (t - keys[i - 1]) / (keys[i] - keys[i - 1]);
        return values[i - 1] + (values[i] - values[i - 1]) * ease(local);
      }
    }
    return values[values.length - 1];
  }

  private setPanelLook(name: string, brightness: number, saturation: number): void {
    const cm = this.panels[name].cm.colorMatrix;
    cm.brightness(brightness);
    cm.saturate(saturation - 1, true);
  }

  private lightPanel(name: string): void {
    const img = this.panels[name].image;
    const keys = [0, 0.14, 1];
    this.animate(1000, (t) => {
      const b = TitleScene.keyframe(t, keys, [0.1, 2.7, 1], LIGHT_EASE);
      const s = TitleScene.keyframe(t, keys, [0.35, 1.9, 1.05], LIGHT_EASE);
      const scale = TitleScene.keyframe(t, keys, [1, 1.03, 1], LIGHT_EASE);
      this.setPanelLook(name, b, s);
      img.setScale(0.5 * scale);
    });
  }

  private setBgBrightness(b: number): void {
    const v = Math.round(Phaser.Math.Clamp(b, 0, 1) * 255);
    this.bg.setTint((v << 16) | (v << 8) | v);
  }

  private lightBg(): void {
    this.animate(1200, (t) => this.setBgBrightness(0.1 + 0.28 * EASE(t)));
  }

  private sweepSearch(seconds: number): void {
    const keys = [0, 0.3, 0.5, 0.7, 0.88, 1];
    const xs = [0.08, 0.3, 0.72, 0.28, 0.74, 0.5];
    const ys = [0.3, 0.28, 0.26, 0.78, 0.8, 0.55];
    const aKeys = [0, 0.1, 0.88, 1];
    const alphas = [0, 1, 1, 0];
    this.animate(seconds * 1000, (t) => {
      this.search.setPosition(
        this.artX(TitleScene.keyframe(t, keys, xs, EASE_IN_OUT)),
        this.artY(TitleScene.keyframe(t, keys, ys, EASE_IN_OUT)),
      );
      this.search.setAlpha(TitleScene.keyframe(t, aKeys, alphas, EASE_IN_OUT));
    });
  }

  private doFlash(): void {
    this.flash.setAlpha(0.95);
    this.animate(600, (t) => this.flash.setAlpha(0.95 * (1 - EASE_OUT(t))));
  }

  private shake(): void {
    // Decaying jolt like the original (translate in cqw units).
    const keys = [0, 0.15, 0.3, 0.45, 0.6, 1];
    const xs = [0, -1.2, 1, -0.6, 0.4, 0];
    const ys = [0, 0.8, -0.6, 0.4, -0.2, 0];
    const cam = this.cameras.main;
    this.animate(450, (t) => {
      const e = SHAKE_EASE(t);
      cam.setScroll(-TitleScene.keyframe(e, keys, xs, (x) => x) * CQ, -TitleScene.keyframe(e, keys, ys, (x) => x) * CQ);
    });
  }

  private fadeIn(obj: Phaser.GameObjects.Image, ms: number): void {
    this.animate(ms, (t) => obj.setAlpha(EASE(t)));
  }

  private drawFrame(): void {
    this.animate(700, (t) => this.drawFramePaths(DRAW_EASE(t)));
  }

  /** The glowing frame lines between panels, drawn to `progress` of their length. */
  private drawFramePaths(progress: number): void {
    const g = this.frame;
    g.clear();
    const p = (x: number, y: number): [number, number] => [this.artX(x / SVG_W), this.artY(y / SVG_H)];
    const paths: [number, number][][] = [
      [p(1152, 324), p(1783, 858), p(1152, 1641), p(505, 858), p(1152, 324)],
      [p(1152, 324), p(1152, 0)],
      [p(1152, 1641), p(1152, 1728)],
      [p(505, 858), p(0, 858)],
      [p(1783, 858), p(2304, 858)],
    ];
    const stroke = 12 * (ART_W / SVG_W);
    const layers: [number, number, number][] = [
      [stroke + 18, 0x86e9ff, 0.18],
      [stroke + 8, 0x86e9ff, 0.4],
      [stroke, 0xffffff, 1],
    ];
    for (const [width, color, alpha] of layers) {
      g.lineStyle(width, color, alpha);
      for (const path of paths) this.strokePartial(g, path, progress);
    }
  }

  private strokePartial(g: Phaser.GameObjects.Graphics, pts: [number, number][], progress: number): void {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let remaining = total * progress;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && remaining > 0; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const f = Math.min(1, remaining / len);
      g.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
      remaining -= len;
    }
    g.strokePath();
  }

  // ---------------------------------------------------------------- logo

  private buildLogo(): void {
    const fs = 5.9 * CQ;
    const top = H * 0.58;
    const lineH = fs * 0.9;
    TITLE.words.forEach((text, i) => {
      const y = top + lineH * (i + 0.5);
      this.words.push(this.makeWord(`title-word-${i}`, text, y, i === 0 ? -0.7 * H : 0.7 * H));
    });
    this.subY = top + lineH * 2 + 0.9 * CQ + 1.7 * CQ * 0.6;
    this.sub = this.add.image(W / 2, this.subY + CQ, this.subTexture()).setScale(1 / K).setAlpha(0);
  }

  private subY = 0;

  private makeWord(key: string, text: string, y: number, from: number): Word {
    const fs = 5.9 * CQ * K;
    const font = `800 ${fs}px "${TITLE_FONT}"`;
    const spacing = `${0.015 * fs}px`;
    const measure = document.createElement('canvas').getContext('2d')!;
    measure.font = font;
    measure.letterSpacing = spacing;
    const tw = measure.measureText(text).width;
    const pad = 4 * CQ * K;
    const cw = Math.ceil(tw + pad * 2);
    const ch = Math.ceil(fs * 0.9 + pad * 2);
    const cx = cw / 2;
    const cy = pad + fs * 0.45;

    const setup = (c: CanvasRenderingContext2D) => {
      c.font = font;
      c.letterSpacing = spacing;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
    };

    // Base: navy extrusion + outline and the red back layer, then the chrome face.
    const base = document.createElement('canvas');
    base.width = cw;
    base.height = ch;
    const b = base.getContext('2d')!;
    setup(b);
    const redStroke = 1.2 * CQ * K;
    const shadowAt = (dx: number, dy: number, color: string, blur = 0) => {
      b.save();
      if (blur > 0) b.filter = `blur(${blur}px)`;
      b.fillStyle = color;
      b.strokeStyle = color;
      b.lineWidth = redStroke;
      b.strokeText(text, cx + dx * CQ * K, cy + dy * CQ * K);
      b.fillText(text, cx + dx * CQ * K, cy + dy * CQ * K);
      b.restore();
    };
    shadowAt(0, 1.8, 'rgba(0,0,0,.7)', CQ * K);
    shadowAt(0, 1.1, COLORS.navyDeep);
    shadowAt(0, 0.85, COLORS.navy);
    shadowAt(0, 0.6, COLORS.navy);
    for (const [dx, dy] of [
      [0.25, 0.25],
      [-0.25, 0.25],
      [0.25, -0.25],
      [-0.25, -0.25],
      [0.35, 0],
      [-0.35, 0],
      [0, 0.35],
      [0, -0.35],
    ]) {
      shadowAt(dx, dy, COLORS.navy);
    }
    shadowAt(0, 0, COLORS.red);

    const boxTop = cy - fs * 0.45;
    const boxHeight = fs * 0.9;
    const grad = b.createLinearGradient(0, boxTop, 0, boxTop + boxHeight);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.26, '#eef2fc');
    grad.addColorStop(0.47, COLORS.chromeMid);
    grad.addColorStop(0.51, COLORS.chromeLo);
    grad.addColorStop(0.6, '#b8c6ea');
    grad.addColorStop(0.88, '#ffffff');
    grad.addColorStop(1, '#dfe6f7');
    b.fillStyle = grad;
    b.fillText(text, cx, cy);
    b.lineWidth = 0.08 * CQ * K;
    b.strokeStyle = 'rgba(18,24,82,.9)';
    b.strokeText(text, cx, cy);

    // Glyph mask for the sheen.
    const glyphs = document.createElement('canvas');
    glyphs.width = cw;
    glyphs.height = ch;
    const gctx = glyphs.getContext('2d')!;
    setup(gctx);
    gctx.fillStyle = '#fff';
    gctx.fillText(text, cx, cy);

    if (!this.sheenCanvas) this.sheenCanvas = document.createElement('canvas');

    const tex = canvasTexture(this, key, cw, ch, (c) => c.drawImage(base, 0, 0))!;
    const image = this.add.image(W / 2, y + from, key).setScale((1 / K) * 1.3).setAlpha(0);
    return { image, tex, base, glyphs, boxLeft: cx - tw / 2, boxWidth: tw, boxTop, boxHeight, y, from };
  }

  private dropWord(w: Word): void {
    w.image.setAlpha(1);
    this.animate(750, (t) => {
      const e = DROP_EASE(t);
      w.image.setY(w.y + w.from * (1 - e));
      w.image.setScale((1 / K) * (1.3 - 0.3 * e));
    });
  }

  /** Redraw a word with the moving highlight band at CSS background-position `pos` (180% -> -80%). */
  private drawSheen(w: Word, pos: number): void {
    const ctx = w.tex.getContext();
    const cw = w.base.width;
    const ch = w.base.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(w.base, 0, 0);

    const s = this.sheenCanvas;
    if (s.width !== cw || s.height !== ch) {
      s.width = cw;
      s.height = ch;
    }
    const sc = s.getContext('2d')!;
    sc.globalCompositeOperation = 'source-over';
    sc.clearRect(0, 0, cw, ch);
    sc.drawImage(w.glyphs, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    const bw = w.boxWidth;
    const centerX = w.boxLeft - 1.6 * bw * pos + 1.3 * bw;
    const centerY = w.boxTop + w.boxHeight / 2;
    const half = 0.208 * bw;
    const dx = Math.sin((100 * Math.PI) / 180) * half;
    const dy = -Math.cos((100 * Math.PI) / 180) * half;
    const g = sc.createLinearGradient(centerX - dx, centerY - dy, centerX + dx, centerY + dy);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = g;
    sc.fillRect(0, 0, cw, ch);
    ctx.drawImage(s, 0, 0);
    w.tex.refresh();
  }

  private sheen(): void {
    this.animate(1300, (t) => {
      const pos = 1.8 - 2.6 * EASE_IN_OUT(t);
      for (const w of this.words) this.drawSheen(w, pos);
    });
  }

  private showSub(): void {
    this.animate(600, (t) => {
      const e = EASE(t);
      this.sub.setAlpha(e).setY(this.subY + CQ * (1 - e));
    });
  }

  private showTap(): void {
    this.ready = true;
    this.tap.setAlpha(1);
    this.track(this.tweens.add({ targets: this.tap, alpha: 0.35, duration: 750, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 }));
    this.track(this.tweens.add({ targets: this.art, scale: 1.045, duration: 16000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 }));
    this.time.addEvent({ delay: TITLE.sheenEvery * 1000, loop: true, callback: () => this.sheen() });
  }

  private subTexture(): string {
    const fs = 1.7 * CQ * K;
    const icon = 1.6 * CQ * K;
    const gap = 0.8 * CQ * K;
    const font = `800 ${fs}px "${TITLE_FONT}"`;
    const spacing = `${0.34 * fs}px`;
    const m = document.createElement('canvas').getContext('2d')!;
    m.font = font;
    m.letterSpacing = spacing;
    // Letter spacing adds a trailing gap after the last letter, as in CSS.
    const tw = m.measureText(TITLE.subtitle).width;
    const pad = 2 * CQ * K;
    const w = tw + icon * 2 + gap * 2 + pad * 2;
    const h = fs * 1.4 + pad * 2;
    canvasTexture(this, 'title-sub', w, h, (c) => {
      const cy = h / 2;
      const heart = new Path2D(HEART_PATH);
      const star = new Path2D(STAR_PATH);
      const drawIcon = (p: Path2D, x: number, color: string) => {
        c.save();
        c.translate(x, cy - icon / 2);
        c.scale(icon / 24, icon / 24);
        c.fillStyle = color;
        c.fill(p);
        c.restore();
      };
      drawIcon(heart, pad, '#ff4fa6');
      drawIcon(star, pad + icon + gap + tw + gap, '#ffd23f');
      c.font = font;
      c.letterSpacing = spacing;
      c.textBaseline = 'middle';
      const tx = pad + icon + gap;
      c.fillStyle = '#ffffff';
      c.save();
      c.shadowColor = 'rgba(134,233,255,.6)';
      c.shadowBlur = 1.4 * CQ * K;
      c.fillText(TITLE.subtitle, tx, cy);
      c.restore();
      c.save();
      c.shadowColor = COLORS.navy;
      c.shadowOffsetY = 0.2 * CQ * K;
      c.fillText(TITLE.subtitle, tx, cy);
      c.restore();
    });
    return 'title-sub';
  }

  /** Single-line UI text with a navy drop and a soft glow, drawn at 2x. Returns the texture key. */
  private textTexture(key: string, text: string, sizeCq: number, spacingEm: number, color: string, glow: string, glowCq: number): string {
    const fs = sizeCq * CQ * K;
    const font = `800 ${fs}px "${TITLE_FONT}"`;
    const spacing = `${spacingEm * fs}px`;
    const m = document.createElement('canvas').getContext('2d')!;
    m.font = font;
    m.letterSpacing = spacing;
    const tw = m.measureText(text).width;
    const pad = 2.5 * CQ * K;
    canvasTexture(this, key, tw + pad * 2, fs * 1.4 + pad * 2, (c) => {
      c.font = font;
      c.letterSpacing = spacing;
      c.textBaseline = 'middle';
      c.fillStyle = color;
      const y = pad + fs * 0.7;
      c.save();
      c.shadowColor = glow;
      c.shadowBlur = glowCq * CQ * K;
      c.fillText(text, pad, y);
      c.restore();
      c.save();
      c.shadowColor = COLORS.navy;
      c.shadowOffsetY = 0.2 * CQ * K;
      c.fillText(text, pad, y);
      c.restore();
    });
    return key;
  }

  // ---------------------------------------------------------------- textures

  private makeSearchTexture(): void {
    const r = 115;
    canvasTexture(this, 'title-search', r * 2, r * 2, (c) => {
      const g = c.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, 'rgba(134,233,255,.55)');
      g.addColorStop(0.5, 'rgba(134,233,255,.18)');
      g.addColorStop(1, 'rgba(134,233,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, r * 2, r * 2);
    });
  }

  private makeShadeTexture(): void {
    canvasTexture(this, 'title-shade', W, H, (c) => {
      c.save();
      c.translate(W * 0.5, H * 0.74);
      c.scale(1, (0.24 * H) / (0.28 * W));
      const r = 0.28 * W;
      const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(6,5,26,.8)');
      g.addColorStop(0.5, 'rgba(6,5,26,.55)');
      g.addColorStop(1, 'rgba(6,5,26,0)');
      c.fillStyle = g;
      c.fillRect(-r, -r, r * 2, r * 2);
      c.restore();
      const lg = c.createLinearGradient(0, H, 0, H * 0.84);
      lg.addColorStop(0, 'rgba(6,5,26,.55)');
      lg.addColorStop(1, 'rgba(6,5,26,0)');
      c.fillStyle = lg;
      c.fillRect(0, H * 0.84, W, H * 0.16);
    });
  }

  private makeParticleTextures(): void {
    const S = 64;
    const s = PARTICLE_BASE;
    const at = (key: string, draw: (c: CanvasRenderingContext2D) => void) => {
      if (this.textures.exists(key)) return;
      canvasTexture(this, key, S, S, (c) => {
        c.translate(S / 2, S / 2);
        draw(c);
      });
    };
    at('tp-heart', (c) => {
      c.fillStyle = '#ff4fa6';
      c.beginPath();
      c.moveTo(0, s * 0.35);
      c.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
      c.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
      c.fill();
    });
    at('tp-star', (c) => {
      c.fillStyle = '#ffd23f';
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? s * 0.42 : s;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    });
    PETALS.forEach((petal, n) =>
      at(`tp-flower-${n}`, (c) => {
        c.fillStyle = petal;
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          c.beginPath();
          c.arc(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5, s * 0.42, 0, 7);
          c.fill();
        }
        c.fillStyle = '#ffd23f';
        c.beginPath();
        c.arc(0, 0, s * 0.32, 0, 7);
        c.fill();
      }),
    );
    at('tp-rainbow', (c) => {
      const cols = ['#ff3b5c', '#ff9f1c', '#ffe23f', '#4fdc6b', '#3fa7ff', '#9b5cff'];
      const rs = s * 1.3;
      c.lineWidth = rs * 0.16;
      cols.forEach((col, i) => {
        c.strokeStyle = col;
        c.beginPath();
        c.arc(0, rs * 0.4, rs - i * rs * 0.16, Math.PI, 0);
        c.stroke();
      });
    });
  }

  // ---------------------------------------------------------------- particles

  /** Hearts, stars, flowers and rainbows bursting from under the logo. */
  private burst(n: number): void {
    const ox = W / 2;
    const oy = H * 0.72;
    let made = 0;
    for (let i = 0; i < this.particles.length && made < n; i++) {
      const p = this.particles[i];
      if (p.active) continue;
      const kind = PARTICLE_KINDS[made % 4];
      const a = Math.random() * Math.PI * 2;
      const sp = (0.35 + Math.random() * 1.1) * W * 0.012;
      p.active = true;
      p.x = ox;
      p.y = oy;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp * 0.8 - W * 0.004;
      p.rot = Math.random() * 6;
      p.vr = (Math.random() - 0.5) * 0.25;
      p.size = W * (0.008 + Math.random() * 0.012);
      p.life = 0;
      p.max = 90 + Math.random() * 60;
      p.rainbow = kind === 'tp-rainbow';
      p.image.setTexture(kind === 'tp-flower' ? `tp-flower-${made % 4}` : kind);
      p.image.setScale(p.size / PARTICLE_BASE).setVisible(true);
      made++;
    }
  }

  override update(_time: number, deltaMs: number): void {
    // The original stepped once per 60 fps frame; scale by elapsed frames.
    const f = Math.min(deltaMs, 50) / (1000 / 60);
    const damp = Math.pow(0.975, f);
    const gravity = W * 0.00012;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life += f;
      const t = p.life / p.max;
      if (t >= 1) {
        p.active = false;
        p.image.setVisible(false);
        continue;
      }
      p.vx *= damp;
      p.vy = p.vy * damp + gravity * f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.rot += p.vr * f;
      p.image.setPosition(p.x, p.y);
      p.image.rotation = p.rainbow ? p.rot * 0.2 : p.rot;
      p.image.setAlpha(t < 0.1 ? t * 10 : 1 - Math.pow((t - 0.1) / 0.9, 2));
    }
  }
}
