import type Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { canvasTexture } from './canvasTexture';

export const TITLE_FONT = 'PerfectDark';
/** 1% of the stage width (the `cqw` unit the title animation was designed in). */
export const CQ = GAME_WIDTH / 100;
/** UI text is drawn at 2x and displayed at 0.5. */
export const UI_K = 2;

/** An outlined pill button with Perfect Dark text. Returns the texture key (display it at scale 1 / UI_K). */
export function pillTexture(scene: Phaser.Scene, key: string, text: string, sizeCq = 2.6, color = '#ffffff'): string {
  const k = UI_K;
  const fs = sizeCq * CQ * k;
  const font = `800 ${fs}px "${TITLE_FONT}"`;
  const spacing = `${0.16 * fs}px`;
  const m = document.createElement('canvas').getContext('2d')!;
  m.font = font;
  m.letterSpacing = spacing;
  const tw = m.measureText(text).width;
  const padX = (sizeCq * 1.3) * CQ * k;
  const padY = (sizeCq * 0.54) * CQ * k;
  const border = 0.25 * CQ * k;
  const w = tw + padX * 2 + border * 2;
  const h = fs * 1.25 + padY * 2 + border * 2;
  canvasTexture(scene, key, w, h, (c) => {
    c.lineWidth = border;
    c.strokeStyle = 'rgba(255,255,255,.7)';
    c.beginPath();
    c.roundRect(border / 2, border / 2, w - border, h - border, (h - border) / 2);
    c.stroke();
    c.font = font;
    c.letterSpacing = spacing;
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(text, border + padX, h / 2);
  });
  return key;
}

/** Large Perfect Dark heading with a navy drop shadow and a coloured glow. Returns the texture key. */
export function headingTexture(scene: Phaser.Scene, key: string, text: string, sizeCq: number, color: string, glow: string): string {
  const k = UI_K;
  const fs = sizeCq * CQ * k;
  const font = `800 ${fs}px "${TITLE_FONT}"`;
  const spacing = `${0.06 * fs}px`;
  const m = document.createElement('canvas').getContext('2d')!;
  m.font = font;
  m.letterSpacing = spacing;
  const tw = m.measureText(text).width;
  const pad = 3 * CQ * k;
  canvasTexture(scene, key, tw + pad * 2, fs * 1.4 + pad * 2, (c) => {
    c.font = font;
    c.letterSpacing = spacing;
    c.textBaseline = 'middle';
    const y = pad + fs * 0.7;
    c.fillStyle = color;
    c.save();
    c.shadowColor = glow;
    c.shadowBlur = 1.6 * CQ * k;
    c.fillText(text, pad, y);
    c.restore();
    c.save();
    c.shadowColor = '#121852';
    c.shadowOffsetY = 0.35 * CQ * k;
    c.fillText(text, pad, y);
    c.restore();
  });
  return key;
}
