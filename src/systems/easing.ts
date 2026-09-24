/** CSS-style cubic-bezier easing, so animations ported from CSS keep their feel. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(u) - t;
      if (Math.abs(err) < 1e-5) break;
      const d = slopeX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    // Fall back to bisection if Newton wandered off.
    if (u < 0 || u > 1 || Math.abs(sampleX(u) - t) > 1e-3) {
      let lo = 0;
      let hi = 1;
      u = t;
      for (let i = 0; i < 30; i++) {
        if (sampleX(u) < t) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return sampleY(u);
  };
}

export const EASE = cubicBezier(0.25, 0.1, 0.25, 1);
export const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);
export const EASE_OUT = cubicBezier(0, 0, 0.58, 1);
