import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from '../game/config.js';

export function PhaserCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const game = new Phaser.Game(createPhaserConfig(container));

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <section className="canvas-card" aria-labelledby="canvas-title">
      <div className="canvas-card__header">
        <h2 id="canvas-title">Phaser technical canvas</h2>
        <span className="technical-badge">P0.7 shell</span>
      </div>
      <div ref={containerRef} className="phaser-container" aria-label="Phaser technical canvas" />
    </section>
  );
}
