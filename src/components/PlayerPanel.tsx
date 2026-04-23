// ============================================================
// components/PlayerPanel.tsx – Left panel: player controls
// Renders YouTube embed OR local cover art based on song source
// ============================================================

import { useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  IconPlay, IconPause, IconSkipBack, IconSkipForward,
  IconShuffle, IconVolume, IconVolumeMute, IconMusic, IconYouTube,
} from './Icons';
import { api } from '../services/api';

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function PlayerPanel() {
  const {
    currentSong, isPlaying, currentTime, duration,
    volume, ytReady, playlist,
    togglePlay, seek, nextSong, prevSong, setVolume,
    refreshPlaylist, ytContainerRef,
  } = usePlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const hasNext = playlist.currentIndex !== null && playlist.currentIndex < playlist.totalSongs - 1;
  const hasPrev = playlist.currentIndex !== null && playlist.currentIndex > 0;
  const totalDuration = playlist.songs.reduce((a, s) => a + s.duration, 0);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(ratio * duration, duration)));
  };

  const handleShuffle = async () => {
    await api.shuffle();
    await refreshPlaylist();
  };

  const isYouTube = currentSong?.source === 'youtube';
  const isLocal = currentSong?.source === 'local';

  return (
    <aside className="player-panel">
      {/* Brand */}
      <div className="player-brand">
        <div className="brand-logo">
          <span className="brand-wave">MF</span>
        </div>
        <div>
          <p className="brand-name">MusicFlow</p>
          <p className="brand-sub">Lista Doble Enlazada</p>
        </div>
      </div>

      {/* Source badge */}
      {currentSong && (
        <div className={`source-badge ${currentSong.source}`}>
          {isYouTube ? (
            <><IconYouTube size={12} /> YouTube</>
          ) : (
            <><IconMusic size={12} /> Archivo Local</>
          )}
        </div>
      )}

      {/* Media display area */}
      <div className="media-area">
        {/* YouTube iframe – always rendered, hidden when not YouTube */}
        <div
          className={`yt-embed-wrap ${isYouTube ? 'visible' : 'hidden'}`}
          ref={ytContainerRef}
          aria-hidden={!isYouTube}
        />

        {/* Cover art – shown for local songs */}
        {isLocal && (
          <div className={`cover-art ${isPlaying ? 'playing' : ''}`}>
            {currentSong.coverUrl ? (
              <img src={currentSong.coverUrl} alt={currentSong.title} />
            ) : (
              <div className="cover-placeholder">
                <IconMusic size={48} />
              </div>
            )}
            {isPlaying && (
              <div className="vinyl-ring" />
            )}
          </div>
        )}

        {/* Empty state */}
        {!currentSong && (
          <div className="cover-empty">
            <IconMusic size={52} />
            <p>Selecciona una canción</p>
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="song-info-panel">
        <h2 className="now-title" title={currentSong?.title ?? ''}>
          {currentSong?.title ?? 'Sin canción'}
        </h2>
        <p className="now-artist">{currentSong?.artist ?? '—'}</p>
        <p className="now-album">{currentSong?.album ?? ''}</p>
      </div>

      {/* Progress bar */}
      <div className="progress-section">
        <div
          className="progress-track"
          ref={progressRef}
          onClick={handleProgressClick}
          role="slider"
          aria-label="Progreso de reproducción"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') seek(Math.min(currentTime + 5, duration));
            if (e.key === 'ArrowLeft') seek(Math.max(currentTime - 5, 0));
          }}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }}>
            <div className="progress-thumb" />
          </div>
        </div>
        <div className="progress-times">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-row">
        <button
          className="ctrl-secondary"
          onClick={handleShuffle}
          aria-label="Mezclar playlist"
          title="Shuffle"
        >
          <IconShuffle size={17} />
        </button>

        <button
          className={`ctrl-btn ${!hasPrev ? 'disabled' : ''}`}
          onClick={prevSong}
          disabled={!hasPrev}
          aria-label="Canción anterior"
        >
          <IconSkipBack size={22} />
        </button>

        <button
          className="ctrl-play"
          onClick={togglePlay}
          disabled={!currentSong || (isYouTube && !ytReady)}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <IconPause size={26} /> : <IconPlay size={26} />}
        </button>

        <button
          className={`ctrl-btn ${!hasNext ? 'disabled' : ''}`}
          onClick={nextSong}
          disabled={!hasNext}
          aria-label="Siguiente canción"
        >
          <IconSkipForward size={22} />
        </button>

        <button
          className="ctrl-secondary"
          onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
          aria-label={volume > 0 ? 'Silenciar' : 'Activar sonido'}
          title={volume > 0 ? 'Mute' : 'Unmute'}
        >
          {volume > 0 ? <IconVolume size={17} /> : <IconVolumeMute size={17} />}
        </button>
      </div>

      {/* Volume slider */}
      <div className="volume-row">
        <IconVolumeMute size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input
          type="range"
          className="volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          aria-label="Volumen"
        />
        <IconVolume size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      </div>

      {/* Stats */}
      <div className="player-stats">
        <div className="stat-item">
          <span className="stat-val">{playlist.totalSongs}</span>
          <span className="stat-lbl">canciones</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-val">{fmt(totalDuration)}</span>
          <span className="stat-lbl">duración</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-val">
            {playlist.songs.filter(s => s.source === 'youtube').length}
          </span>
          <span className="stat-lbl">YouTube</span>
        </div>
      </div>
    </aside>
  );
}
