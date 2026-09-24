/** Anything hero shots can hit and home in on. */
export interface Target {
  x: number;
  y: number;
  readonly radius: number;
  /** True while it can be hit. */
  isTargetable(): boolean;
  takeDamage(amount: number): void;
}
