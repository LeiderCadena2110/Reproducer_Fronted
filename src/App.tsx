// ============================================================
// App.tsx – Root component
// ============================================================

import { PlayerProvider } from './context/PlayerContext';
import { PlayerPanel } from './components/PlayerPanel';
import { PlaylistPanel } from './components/PlaylistPanel';

export default function App() {
  return (
    <PlayerProvider>
      <div className="app-root">
        <PlayerPanel />
        <PlaylistPanel />
      </div>
    </PlayerProvider>
  );
}
