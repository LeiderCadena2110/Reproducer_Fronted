// ============================================================
// components/AddSongModal.tsx – Manual song entry modal
// ============================================================

import { useState } from 'react';
import { InsertPosition } from '../types';
import { api } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { IconClose } from './Icons';

interface Props {
  onClose: () => void;
}

export function AddSongModal({ onClose }: Props) {
  const { refreshPlaylist, playlist } = usePlayer();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [duration, setDuration] = useState('');
  const [pos, setPos] = useState<InsertPosition | 'custom'>('end');
  const [customPos, setCustomPos] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = title.trim().length > 0 && artist.trim().length > 0;

  const getFinalPos = (): InsertPosition => {
    if (pos === 'custom') return Math.max(0, Math.min(parseInt(customPos) || 0, playlist.totalSongs));
    return pos;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      await api.addSong({
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim() || undefined,
        genre: genre.trim() || undefined,
        duration: duration ? parseInt(duration) : undefined,
        source: 'local',
        position: getFinalPos(),
      });
      await refreshPlaylist();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al agregar canción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="modal-title">Agregar canción</h2>
          <button className="btn-icon-sm" onClick={onClose} aria-label="Cerrar modal">
            <IconClose size={18} />
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="modal-title-input">Título *</label>
              <input id="modal-title-input" type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre de la canción" required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="modal-artist">Artista *</label>
              <input id="modal-artist" type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Nombre del artista" required />
            </div>
            <div className="field">
              <label htmlFor="modal-album">Álbum</label>
              <input id="modal-album" type="text" value={album} onChange={e => setAlbum(e.target.value)} placeholder="Nombre del álbum" />
            </div>
            <div className="field">
              <label htmlFor="modal-genre">Género</label>
              <input id="modal-genre" type="text" value={genre} onChange={e => setGenre(e.target.value)} placeholder="Pop, Rock, Jazz..." />
            </div>
            <div className="field">
              <label htmlFor="modal-duration">Duración (segundos)</label>
              <input id="modal-duration" type="number" min={0} value={duration} onChange={e => setDuration(e.target.value)} placeholder="200" />
            </div>
          </div>

          <div className="field">
            <label>Insertar en</label>
            <div className="pos-group">
              {(['start', 'end', 'custom'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`pos-chip ${pos === p ? 'active' : ''}`}
                  onClick={() => setPos(p)}
                >
                  {p === 'start' ? '⬆ Inicio' : p === 'end' ? '⬇ Final' : '# Posición'}
                </button>
              ))}
            </div>
            {pos === 'custom' && (
              <input
                className="pos-input"
                type="number"
                min={0}
                max={playlist.totalSongs}
                placeholder={`0 – ${playlist.totalSongs}`}
                value={customPos}
                onChange={e => setCustomPos(e.target.value)}
                style={{ marginTop: '8px' }}
              />
            )}
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
        </form>

        <div className="modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? 'Agregando...' : '+ Agregar'}
          </button>
        </div>
      </div>
    </div>
  );
}
