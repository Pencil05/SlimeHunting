import Phaser from 'phaser';

export class TechnicalScene extends Phaser.Scene {
  constructor() {
    super('technical-scene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#111a2e');
    this.add.rectangle(width / 2, height / 2, width - 32, height - 32, 0x1c2d4d).setStrokeStyle(2, 0x4f7cac);
    this.add.text(width / 2, height / 2 - 16, 'TECHNICAL CANVAS', {
      color: '#d8e7ff',
      fontFamily: 'monospace',
      fontSize: '20px',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 18, 'foundation_room ready', {
      color: '#8fc7a3',
      fontFamily: 'monospace',
      fontSize: '14px',
    }).setOrigin(0.5);
  }
}
