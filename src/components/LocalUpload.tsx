// ============================================================
// components/LocalUpload.tsx
// Upload local audio files (blob URLs stay in browser)
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { InsertPosition, LocalFileEntry } from '../types';
import { IconUpload, IconMusic, IconPlus, IconClose } from './Icons';

function fmtDur(s: number): string {
  if (!isFinite(s) || s <= 0) return '–:––';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseFilename(filename: string): { title: string; artist: string } {
  const base = filename.replace(/\.[^.]+$/, '');
  const sep = base.indexOf(' - ');
  if (sep > 0) {
    return { artist: base.slice(0, sep).trim(), title: base.slice(sep + 3).trim() };
  }
  return { title: base, artist: 'Artista desconocido' };
}

async function readAudioDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(audio.duration || 0); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    setTimeout(() => { URL.revokeObjectURL(url); resolve(0); }, 3000);
  });
}

export function LocalUpload() {
  const { refreshPlaylist, playlist, registerBlob } = usePlayer();
  const [entries, setEntries] = useState<LocalFileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [adding, setAdding] = useState<Set<number>>(new Set());
  const [pos, setPos] = useState<InsertPosition>('end');
  const [customPos, setCustomPos] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      entries.forEach(e => { if (!e.songId) URL.revokeObjectURL(e.blobUrl); });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    const audioFiles = files.filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|opus|webm)$/i.test(f.name)
    );
    if (audioFiles.length === 0) return;

    setProcessing(true);
    const newEntries: LocalFileEntry[] = [];

    for (const file of audioFiles) {
      const blobUrl = URL.createObjectURL(file);
      const duration = await readAudioDuration(file);
      const { title, artist } = parseFilename(file.name);
      newEntries.push({ file, blobUrl, title, artist, duration });
    }

    setEntries(prev => [...prev, ...newEntries]);
    setProcessing(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeEntry = (i: number) => {
    setEntries(prev => {
      const entry = prev[i];
      if (entry && !entry.songId) URL.revokeObjectURL(entry.blobUrl);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const updateEntry = (i: number, patch: Partial<LocalFileEntry>) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  };

  const handleAddOne = async (i: number) => {
    const entry = entries[i];
    if (!entry || entry.songId || adding.has(i)) return;

    setAdding(prev => new Set(prev).add(i));
    try {
      const insertPos: InsertPosition = typeof pos === 'number'
        ? Math.max(0, Math.min(parseInt(customPos) || 0, playlist.totalSongs))
        : pos;

      const result = await api.addSong({
        title: entry.title,
        artist: entry.artist,
        album: 'Local',
        duration: Math.round(entry.duration),
        genre: 'Local',
        source: 'local',
        position: insertPos,
      });

      const songId = result.song.id;
      registerBlob(songId, entry.blobUrl);
      updateEntry(i, { songId });
      await refreshPlaylist();
    } catch (e) {
      console.error('addSong error', e);
    } finally {
      setAdding(prev => { const n = new Set(prev); n.delete(i); return n; });
    }
  };

  const handleAddAll = async () => {
    const unAdded = entries.map((_, i) => i).filter(i => !entries[i].songId);
    for (const i of unAdded) await handleAddOne(i);
  };

  const unadded = entries.filter(e => !e.songId).length;

  return (
    <div className="tab-content">
      {/* Drop zone */}
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${processing ? 'processing' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Subir archivos de audio"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.opus"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
        <div className="drop-icon">
          {processing ? <span className="spin-md" /> : <IconUpload size={36} />}
        </div>
        <p className="drop-title">
          {dragging ? 'Suelta los archivos aquí' :
           processing ? 'Procesando...' :
           'Arrastra archivos de audio o haz clic'}
        </p>
        <p className="drop-sub">MP3, WAV, OGG, FLAC, AAC, M4A</p>
      </div>

      {/* Position selector */}
      {entries.length > 0 && (
        <div className="upload-options">
          <span className="upload-options-label">Insertar en:</span>
          <div className="pos-group">
            {(['start', 'end'] as InsertPosition[]).map(p => (
              <button
                key={p as string}
                className={`pos-chip ${pos === p ? 'active' : ''}`}
                onClick={() => setPos(p)}
              >
                {p === 'start' ? '⬆ Inicio' : '⬇ Final'}
              </button>
            ))}
            <button
              className={`pos-chip ${typeof pos === 'number' ? 'active' : ''}`}
              onClick={() => setPos(0)}
            >
              # Posición
            </button>
          </div>
          {typeof pos === 'number' && (
            <input
              className="pos-input"
              type="number"
              min={0}
              max={playlist.totalSongs}
              placeholder={`0 – ${playlist.totalSongs}`}
              value={customPos}
              onChange={e => { setCustomPos(e.target.value); setPos(parseInt(e.target.value) || 0); }}
            />
          )}
        </div>
      )}

      {/* File list */}
      {entries.length > 0 && (
        <div className="upload-list">
          <div className="upload-list-header">
            <span>{entries.length} archivo{entries.length !== 1 ? 's' : ''}</span>
            {unadded > 1 && (
              <button className="btn-add-all" onClick={handleAddAll}>
                <IconPlus size={14} />
                Agregar todos ({unadded})
              </button>
            )}
          </div>

          {entries.map((entry, i) => (
            <div key={`${entry.file.name}-${i}`} className={`upload-entry ${entry.songId ? 'added' : ''}`}>
              {/* Icon */}
              <div className="upload-entry-icon">
                <IconMusic size={18} />
              </div>

              {/* Editable metadata */}
              <div className="upload-meta">
                <input
                  className="meta-input title"
                  value={entry.title}
                  onChange={e => updateEntry(i, { title: e.target.value })}
                  placeholder="Título"
                  disabled={!!entry.songId}
                  aria-label="Título de la canción"
                />
                <input
                  className="meta-input artist"
                  value={entry.artist}
                  onChange={e => updateEntry(i, { artist: e.target.value })}
                  placeholder="Artista"
                  disabled={!!entry.songId}
                  aria-label="Artista"
                />
              </div>

              {/* File info */}
              <div className="upload-file-info">
                <span className="file-dur">{fmtDur(entry.duration)}</span>
                <span className="file-size">{fmtSize(entry.file.size)}</span>
              </div>

              {/* Actions */}
              <div className="upload-actions">
                {entry.songId ? (
                  <span className="added-badge">✓ En playlist</span>
                ) : (
                  <button
                    className="btn-add-file"
                    onClick={() => handleAddOne(i)}
                    disabled={adding.has(i)}
                    aria-label={`Agregar ${entry.title}`}
                  >
                    {adding.has(i) ? (
                      <span className="spin-sm" />
                    ) : (
                      <><IconPlus size={14} /><span>Agregar</span></>
                    )}
                  </button>
                )}
                <button
                  className="btn-remove-file"
                  onClick={() => removeEntry(i)}
                  aria-label={`Quitar ${entry.title} de la lista`}
                >
                  <IconClose size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !processing && (
        <div className="upload-empty">
          <p className="upload-empty-note">
            Los archivos se reproducen directamente en el navegador. No se envían al servidor.
          </p>
        </div>
      )}
    </div>
  );
}
