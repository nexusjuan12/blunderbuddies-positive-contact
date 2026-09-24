import Phaser from 'phaser';
import { Debug, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { HappyHillsScene } from './scenes/HappyHillsScene';
import { ResultScene } from './scenes/ResultScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: { target: 60 },
  input: { gamepad: true, activePointers: 2 },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [BootScene, TitleScene, HappyHillsScene, ResultScene],
});

if (Debug.expose) (window as unknown as { game: Phaser.Game }).game = game;
