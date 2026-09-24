import Phaser from 'phaser';

/**
 * Plays Buddy voice clips from a small finite library.
 * Pitch is randomised by up to ±1 semitone and the same clip never plays twice in a row.
 */
export class VoiceBank {
  private last = '';
  private cooldown = 0;
  private current: Phaser.Sound.BaseSound | null = null;

  /**
   * @param minGap Seconds after a clip during which new requests are ignored (needs `update()` each frame).
   * @param interrupt A new clip cuts off the one still playing (e.g. flicking between Buddies on the select screen).
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly volume = 0.9,
    private readonly minGap = 0.4,
    private readonly interrupt = false,
  ) {}

  play(clips: readonly string[]): void {
    if (clips.length === 0 || this.cooldown > 0) return;
    let key = clips[Math.floor(Math.random() * clips.length)];
    if (key === this.last && clips.length > 1) {
      key = clips[(clips.indexOf(key) + 1) % clips.length];
    }
    if (!this.scene.cache.audio.exists(key)) return;
    this.last = key;
    this.cooldown = this.minGap;
    if (this.interrupt && this.current?.isPlaying) this.current.stop();
    this.current = this.scene.sound.add(key, { volume: this.volume, detune: (Math.random() * 2 - 1) * 100 });
    this.current.once(Phaser.Sound.Events.COMPLETE, (s: Phaser.Sound.BaseSound) => s.destroy());
    this.current.once(Phaser.Sound.Events.STOP, (s: Phaser.Sound.BaseSound) => s.destroy());
    this.current.play();
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
  }
}
