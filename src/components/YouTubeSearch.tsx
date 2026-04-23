// ============================================================
// components/YouTubeSearch.tsx
// Search YouTube and add results to playlist
// ============================================================

import { useState, useRef } from 'react';
import { YouTubeSearchResult, InsertPosition } from '../types';
import { api } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { IconSearch, IconYouTube, IconPlus, IconClose } from './Icons';

function fmt(s: number): string {
  if (!s) return '–:––';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

type LocalPos = InsertPosition | 'custom';

interface AddMenuProps {
  result: YouTubeSearchResult;
  totalSongs: number;
  onAdd: (result: YouTubeSearchResult, pos: InsertPosition) => Promise<void>;
  onClose: () => void;
}

function AddMenu({ result, totalSongs, onAdd, onClose }: AddMenuProps) {
  const [pos, setPos] = useState<LocalPos>('end');
  const [customPos, setCustomPos] = useState('');
  const [loading, setLoading] = useState(false);

  const getFinalPos = (): InsertPosition => {
    if (pos === 'custom') return Math.max(0, Math.min(parseInt(customPos) || 0, totalSongs));
    return pos;
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      await onAdd(result, getFinalPos());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-menu" role="dialog" aria-label="Agregar canción">
      <div className="add-menu-header">
        <span>Insertar en posición</span>
        <button onClick={onClose} aria-label="Cerrar" className="btn-icon-sm">
          <IconClose size={14} />
        </button>
      </div>
      <div className="pos-group">
        {(['start', 'end', 'custom'] as LocalPos[]).map(p => (
          <button
            key={String(p)}
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
          max={totalSongs}
          placeholder={`0 – ${totalSongs}`}
          value={customPos}
          onChange={e => setCustomPos(e.target.value)}
          autoFocus
        />
      )}
      <button className="btn-confirm" onClick={handleAdd} disabled={loading}>
        {loading ? 'Agregando...' : '+ Agregar a playlist'}
      </button>
    </div>
  );
}

export function YouTubeSearch() {
  const { refreshPlaylist, playlist } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const data = await api.youtubeSearch(q);
      setResults(data);
      if (data.length === 0) setError('No se encontraron resultados.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al buscar en YouTube');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  const handleAdd = async (result: YouTubeSearchResult, pos: InsertPosition) => {
    await api.addSong({
      title: result.title,
      artist: result.channelTitle,
      album: 'YouTube',
      duration: result.duration,
      genre: 'YouTube',
      coverUrl: result.thumbnail,
      source: 'youtube',
      videoId: result.videoId,
      position: pos,
    });
    await refreshPlaylist();
    setAdded(prev => new Set(prev).add(result.videoId));
    setActiveMenu(null);
  };

  return (
    <div className="tab-content">
      {/* Search bar */}
      <div className="yt-search-bar">
        <div className="search-input-wrap">
          <IconSearch size={17} className="search-icon-inner" />
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Buscar canciones en YouTube..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Buscar en YouTube"
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} aria-label="Limpiar búsqueda">
              <IconClose size={14} />
            </button>
          )}
        </div>
        <button className="btn-search" onClick={search} disabled={loading || !query.trim()} aria-label="Buscar">
          {loading ? (
            <span className="spin-sm" />
          ) : (
            <IconSearch size={16} />
          )}
          <span>{loading ? 'Buscando...' : 'Buscar'}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="search-error" role="alert">
          <IconYouTube size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="yt-results">
          <p className="results-count">{results.length} resultados para "{query}"</p>
          <div className="yt-grid">
            {results.map(r => (
              <div key={r.videoId} className={`yt-result-card ${added.has(r.videoId) ? 'added' : ''}`}>
                <div className="yt-thumb-wrap">
                  <img
                    className="yt-thumb"
                    src={r.thumbnail}
                    alt={r.title}
                    loading="lazy"
                  />
                  <span className="yt-duration-badge">{fmt(r.duration)}</span>
                  <div className="yt-thumb-overlay">
                    <IconYouTube size={28} className="yt-logo" />
                  </div>
                </div>
                <div className="yt-result-info">
                  <p className="yt-result-title" title={r.title}>{r.title}</p>
                  <p className="yt-result-channel">{r.channelTitle}</p>
                </div>
                <div className="yt-result-actions">
                  {activeMenu === r.videoId ? (
                    <AddMenu
                      result={r}
                      totalSongs={playlist.totalSongs}
                      onAdd={handleAdd}
                      onClose={() => setActiveMenu(null)}
                    />
                  ) : (
                    <button
                      className={`btn-add-yt ${added.has(r.videoId) ? 'added' : ''}`}
                      onClick={() => setActiveMenu(r.videoId)}
                      aria-label={added.has(r.videoId) ? 'Agregado a playlist' : 'Agregar a playlist'}
                    >
                      {added.has(r.videoId) ? (
                        <span>✓ Agregado</span>
                      ) : (
                        <><IconPlus size={14} /><span>Agregar</span></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div className="search-empty">
          <IconYouTube size={48} className="empty-yt-icon" />
          <p className="empty-title">Busca música en YouTube</p>
          <p className="empty-sub">Los videos se agregan directamente a tu playlist</p>
        </div>
      )}
    </div>
  );
}
