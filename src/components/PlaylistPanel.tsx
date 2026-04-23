// ============================================================
// components/PlaylistPanel.tsx – Right panel with tabs
// ============================================================

import { useState } from 'react';
import { Song } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { SongCard } from './SongCard';
import { YouTubeSearch } from './YouTubeSearch';
import { LocalUpload } from './LocalUpload';
import { AddSongModal } from './AddSongModal';
import { IconList, IconYouTube, IconUpload, IconPlus, IconShuffle, IconTrash } from './Icons';

type Tab = 'playlist' | 'youtube' | 'upload';

export function PlaylistPanel() {
  const {
    playlist, isPlaying,
    playSong, refreshPlaylist, revokeBlob,
  } = usePlayer();

  const [tab, setTab] = useState<Tab>('playlist');
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.deleteSong(id);
      revokeBlob(id);
      await refreshPlaylist();
    } finally {
      setDeleting(null);
    }
  };

  const handleShuffle = async () => {
    await api.shuffle();
    await refreshPlaylist();
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Eliminar todas las canciones?')) return;
    await api.clearPlaylist();
    await refreshPlaylist();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'playlist', label: 'Playlist', icon: <IconList size={16} /> },
    { id: 'youtube', label: 'YouTube', icon: <IconYouTube size={16} /> },
    { id: 'upload', label: 'Subir', icon: <IconUpload size={16} /> },
  ];

  return (
    <main className="playlist-panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Mi Playlist</h1>
          <p className="panel-sub">
            {playlist.totalSongs} canción{playlist.totalSongs !== 1 ? 'es' : ''}
            {' · '}Lista doblemente enlazada
          </p>
        </div>
        {tab === 'playlist' && (
          <div className="panel-actions">
            <button className="btn-icon-action" onClick={handleShuffle} title="Shuffle" aria-label="Mezclar playlist">
              <IconShuffle size={16} />
            </button>
            <button className="btn-icon-action" onClick={handleClearAll} title="Limpiar todo" aria-label="Limpiar playlist">
              <IconTrash size={16} />
            </button>
            <button className="btn-cta" onClick={() => setShowModal(true)} aria-label="Agregar canción manualmente">
              <IconPlus size={15} />
              Agregar
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Panel de contenido">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.id === 'playlist' && playlist.totalSongs > 0 && (
              <span className="tab-count">{playlist.totalSongs}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="tab-pane" role="tabpanel">
        {tab === 'playlist' && (
          <div className="tab-content">
            {playlist.songs.length === 0 ? (
              <div className="empty-playlist">
                <IconList size={48} className="empty-icon" />
                <p className="empty-title">Tu playlist está vacía</p>
                <p className="empty-sub">Busca en YouTube o sube archivos locales</p>
                <div className="empty-actions">
                  <button className="btn-cta" onClick={() => setTab('youtube')}>
                    <IconYouTube size={15} /> Buscar en YouTube
                  </button>
                  <button className="btn-ghost" onClick={() => setTab('upload')}>
                    <IconUpload size={15} /> Subir archivos
                  </button>
                </div>
              </div>
            ) : (
              <div className="song-list" role="list">
                {playlist.songs.map((song: Song, i) => (
                  <div
                    key={song.id}
                    role="listitem"
                    className={deleting === song.id ? 'deleting' : ''}
                  >
                    <SongCard
                      song={song}
                      index={i}
                      isActive={playlist.currentIndex === i}
                      isPlaying={isPlaying && playlist.currentIndex === i}
                      onPlay={playSong}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'youtube' && <YouTubeSearch />}
        {tab === 'upload' && <LocalUpload />}
      </div>

      {showModal && <AddSongModal onClose={() => setShowModal(false)} />}
    </main>
  );
}
