import Phaser from 'phaser';
import { TechnicalScene } from './scenes/TechnicalScene.js';

export const createPhaserConfig = (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 720,
  height: 420,
  backgroundColor: '#111a2e',
  scene: [TechnicalScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
