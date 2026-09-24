import Phaser from 'phaser';

const STICK_DEADZONE = 0.2;

/**
 * Unifies touch, keyboard and gamepad into one per-frame movement request.
 * - `dirX/dirY`: analog/digital direction in -1..1 (keyboard, gamepad), scaled by hero speed.
 * - `dragX/dragY`: finger movement in game px since last frame (relative touch drag).
 * - `focus`: slow/focus movement held.
 */
export class InputController {
  dirX = 0;
  dirY = 0;
  dragX = 0;
  dragY = 0;
  focus = false;
  /** True while a finger/mouse drag is in progress. */
  dragging = false;

  private readonly keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'shift', Phaser.Input.Keyboard.Key> | null;
  private dragPointerId = -1;
  private lastX = 0;
  private lastY = 0;
  private accumX = 0;
  private accumY = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb
      ? {
          up: kb.addKey(K.UP),
          down: kb.addKey(K.DOWN),
          left: kb.addKey(K.LEFT),
          right: kb.addKey(K.RIGHT),
          w: kb.addKey(K.W),
          a: kb.addKey(K.A),
          s: kb.addKey(K.S),
          d: kb.addKey(K.D),
          shift: kb.addKey(K.SHIFT),
        }
      : null;

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (this.dragPointerId !== -1) return;
    this.dragPointerId = p.id;
    this.lastX = p.x;
    this.lastY = p.y;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.dragPointerId) return;
    this.accumX += p.x - this.lastX;
    this.accumY += p.y - this.lastY;
    this.lastX = p.x;
    this.lastY = p.y;
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.dragPointerId) this.dragPointerId = -1;
  }

  /** Call once per frame before reading the fields. */
  update(): void {
    let x = 0;
    let y = 0;
    let focus = false;

    const k = this.keys;
    if (k) {
      if (k.left.isDown || k.a.isDown) x -= 1;
      if (k.right.isDown || k.d.isDown) x += 1;
      if (k.up.isDown || k.w.isDown) y -= 1;
      if (k.down.isDown || k.s.isDown) y += 1;
      focus = k.shift.isDown;
    }

    const pad = this.scene.input.gamepad?.pad1;
    if (pad && pad.connected) {
      if (pad.left) x -= 1;
      if (pad.right) x += 1;
      if (pad.up) y -= 1;
      if (pad.down) y += 1;
      const sx = pad.leftStick.x;
      const sy = pad.leftStick.y;
      if (Math.abs(sx) > STICK_DEADZONE) x += sx;
      if (Math.abs(sy) > STICK_DEADZONE) y += sy;
      if (pad.L1 > 0.5 || pad.R1 > 0.5) focus = true;
    }

    // Keep diagonals from being faster than straight lines.
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) {
      x /= len;
      y /= len;
    }

    this.dirX = x;
    this.dirY = y;
    this.focus = focus;
    this.dragX = this.accumX;
    this.dragY = this.accumY;
    this.accumX = 0;
    this.accumY = 0;
    this.dragging = this.dragPointerId !== -1;
  }

  private destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
