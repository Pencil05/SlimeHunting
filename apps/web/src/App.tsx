import { ApiStatus } from './components/ApiStatus.js';
import { PhaserCanvas } from './components/PhaserCanvas.js';
import { RealtimeStatus } from './components/RealtimeStatus.js';
import { getWebRuntimeConfig } from './config.js';

const { apiUrl, realtimeUrl } = getWebRuntimeConfig(import.meta.env);

export function App() {
  return (
    <main className="shell">
      <header className="shell__header">
        <div>
          <p className="eyebrow">SLIME HUNTER / P0.7</p>
          <h1>Technical web shell</h1>
          <p className="shell__lede">
            A React control surface for infrastructure smoke checks and the authoritative foundation
            room.
          </p>
        </div>
        <span className="scope-tag">No gameplay yet</span>
      </header>

      <div className="shell__grid">
        <div className="shell__side-column">
          <ApiStatus apiUrl={apiUrl} />
          <RealtimeStatus realtimeUrl={realtimeUrl} />
        </div>
        <PhaserCanvas />
      </div>

      <footer className="shell__footer">
        <span>API: {apiUrl}</span>
        <span>Realtime: {realtimeUrl}</span>
      </footer>
    </main>
  );
}
