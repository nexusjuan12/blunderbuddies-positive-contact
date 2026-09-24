/** Canvas shape painters shared by placeholder projectile textures and the title-screen particles. */

/** Heart centred on 0,0; `s` is roughly its half-height. */
export function heart(c: CanvasRenderingContext2D, s: number): void {
  c.beginPath();
  c.moveTo(0, s * 0.35);
  c.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.45, -s * 1.05, 0, -s * 0.45);
  c.bezierCurveTo(s * 0.45, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
}

/** Five-pointed star path centred on 0,0. */
export function star(c: CanvasRenderingContext2D, s: number, inner = 0.42): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? s * inner : s;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
}

/** Five-petal flower with a gold centre. */
export function flower(c: CanvasRenderingContext2D, s: number, petal: string): void {
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
}

export const RAINBOW = ['#ff3b5c', '#ff9f1c', '#ffe23f', '#4fdc6b', '#3fa7ff', '#9b5cff'];

/** Small rainbow arc. */
export function rainbow(c: CanvasRenderingContext2D, s: number): void {
  c.lineWidth = s * 0.16;
  RAINBOW.forEach((col, i) => {
    c.strokeStyle = col;
    c.beginPath();
    c.arc(0, s * 0.4, s - i * s * 0.16, Math.PI, 0);
    c.stroke();
  });
}
