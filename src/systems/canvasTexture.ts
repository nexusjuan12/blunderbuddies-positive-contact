import Phaser from 'phaser';

/** Creates (or replaces) a canvas-backed texture drawn with the 2D canvas API. */
export function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D) => void,
): Phaser.Textures.CanvasTexture | null {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) return null;
  draw(tex.getContext());
  tex.refresh();
  return tex;
}
