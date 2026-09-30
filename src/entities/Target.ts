/** Anything hero shots can hit and home in on. */
export interface Target {
  x: number;
  y: number;
  readonly radius: number;
  /** True while it can be hit. */
  isTargetable(): boolean;
  takeDamage(amount: number): void;
  /**
   * Set on hurtboxes that belong to one bigger enemy (a boss with several circles), so area
   * attacks like the beam damage that enemy once, not once per circle.
   */
  readonly owner?: object;
}
