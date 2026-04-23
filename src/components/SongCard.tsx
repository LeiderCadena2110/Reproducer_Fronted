// ============================================================
// components/SongCard.tsx
// ============================================================

import { Song } from '../types';
import { IconTrash, IconYouTube, IconMusic, IconWaveform } from './Icons';

interface Props {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (song: Song) => void;
  onDelete: (id: string) => void;
}

function fmt(s: number): string {
  if (!s || !isFinite(s)) return '–:––';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function SongCard({ song, index, isActive, isPlaying, onPlay, onDelete }: Props) {
  return (
    <div
      className={`song-card ${isActive ? 'active' : ''}`}
      onClick={() => onPlay(song)}
      role="button"
      tabIndex={0}
      aria-label={`Reproducir ${song.title} de ${song.artist}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPlay(song); }}
    >
      {/* Index / playing indicator */}
      <div className="card-index" aria-hidden="true">
        {isActive && isPlaying ? (
          <IconWaveform size={16} className="waveform-anim" />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      {/* Thumbnail */}
      <div className="card-thumb">
        {song.coverUrl ? (
          <img src={song.coverUrl} alt="" loading="lazy" />
        ) : (
          <div className="thumb-placeholder">
            <IconMusic size={16} />
          </div>
        )}
        {/* Source overlay */}
        {song.source === 'youtube' && (
          <div className="yt-overlay" aria-label="YouTube">
            <IconYouTube size={10} />
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="card-info">
        <span className="card-title">{song.title}</span>
        <span className="card-meta">{song.artist} · {song.album}</span>
      </div>

      {/* Genre */}
      <span className="card-genre">{song.genre || '–'}</span>

      {/* Duration */}
      <span className="card-duration">{fmt(song.duration)}</span>

      {/* Delete */}
      <button
        className="card-delete"
        onClick={(e) => { e.stopPropagation(); onDelete(song.id); }}
        aria-label={`Eliminar ${song.title}`}
        tabIndex={-1}
      >
        <IconTrash size={15} />
      </button>
    </div>
  );
}
