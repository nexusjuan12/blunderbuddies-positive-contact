import Phaser from 'phaser';

/**
 * Plays Buddy voice clips from a small finite library.
 * Pitch is randomised by up to ±1 semitone and the same clip never plays twice in a row.
 */
export class VoiceBank {
  private last = '';
  private cooldown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly volume = 0.9,
    private readonly minGap = 0.4,
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
    this.scene.sound.play(key, { volume: this.volume, detune: (Math.random() * 2 - 1) * 100 });
  }

  update(dt: number): void {
    if (this.cooldown > 0) this.cooldown -= dt;
  }
}
