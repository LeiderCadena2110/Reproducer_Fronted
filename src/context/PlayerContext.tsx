// ============================================================
// context/PlayerContext.tsx
// Unified playback state for YouTube IFrame API + HTML5 Audio
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Song, PlaylistState } from '../types';
import { api } from '../services/api';

// ── Types ─────────────────────────────────────────────────

interface PlayerContextValue {
  // State
  playlist: PlaylistState;
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  ytReady: boolean;
  /** Map from song.id → blob URL for local files */
  blobMap: Map<string, string>;

  // Playback controls
  playSong: (song: Song) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  nextSong: () => Promise<void>;
  prevSong: () => Promise<void>;
  setVolume: (v: number) => void;

  // Playlist management
  refreshPlaylist: () => Promise<void>;

  // Local file registration
  registerBlob: (songId: string, blobUrl: string) => void;
  revokeBlob: (songId: string) => void;

  // YT player container ref (render an empty div with this ref)
  ytContainerRef: React.RefObject<HTMLDivElement>;
}

// ── Context ───────────────────────────────────────────────

const PlayerCtx = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error('usePlayer must be inside <PlayerProvider>');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<PlaylistState>({
    songs: [],
    currentIndex: null,
    totalSongs: 0,
    isPlaying: false,
  });
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [ytReady, setYtReady] = useState(false);
  const [blobMap, setBlobMap] = useState<Map<string, string>>(new Map());

  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep latest callbacks in refs to avoid stale closures in YT event handlers
  const onSongEndRef = useRef<() => void>(() => undefined);

  // ── Initialize HTML5 Audio ─────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'metadata';

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
    });
    audio.addEventListener('ended', () => {
      onSongEndRef.current();
    });
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audio.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Initialize YouTube IFrame API ─────────────────────
  useEffect(() => {
    const initPlayer = () => {
      if (!ytContainerRef.current) return;

      // Create inner div for YT to replace
      const inner = document.createElement('div');
      inner.id = 'yt-player-inner';
      ytContainerRef.current.innerHTML = '';
      ytContainerRef.current.appendChild(inner);

      const YT = (window as Window & typeof globalThis).YT;
      ytPlayerRef.current = new YT.Player('yt-player-inner', {
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          fs: 0,
          cc_load_policy: 0,
        },
        events: {
          onReady: (_event: { target: YTPlayer }) => {
            ytPlayerRef.current?.setVolume(Math.round(volume * 100));
            setYtReady(true);
          },
          onStateChange: (event: { target: YTPlayer; data: number }) => {
            const state = event.data;
            if (state === 1) setIsPlaying(true);
            if (state === 2) setIsPlaying(false);
            if (state === 0) onSongEndRef.current(); // ended
          },
          onError: (event: { target: YTPlayer; data: number }) => {
            console.error('[YT Player Error]', event.data);
          },
        },
      });
    };

    const win = window as Window & typeof globalThis;
    if (win.YT?.Player) {
      initPlayer();
    } else {
      const prev = win.onYouTubeIframeAPIReady;
      win.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initPlayer();
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Progress polling for YouTube ──────────────────────
  useEffect(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    if (isPlaying && currentSong?.source === 'youtube' && ytPlayerRef.current) {
      progressTimerRef.current = setInterval(() => {
        const yt = ytPlayerRef.current;
        if (!yt) return;
        try {
          const ct = yt.getCurrentTime();
          const dur = yt.getDuration();
          setCurrentTime(ct || 0);
          if (dur > 0) setDuration(dur);
        } catch {
          // ignore errors if player not ready
        }
      }, 250);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying, currentSong?.source]);

  // ── Auto-advance on song end ──────────────────────────
  onSongEndRef.current = useCallback(async () => {
    try {
      const result = await api.nextSong();
      setPlaylist(result.playlist);
      const nextSong = result.song;
      await activateSong(nextSong);
    } catch {
      setIsPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobMap]);

  // ── Load initial playlist ─────────────────────────────
  const refreshPlaylist = useCallback(async () => {
    const state = await api.getPlaylist();
    setPlaylist(state);
  }, []);

  useEffect(() => {
    refreshPlaylist();
  }, [refreshPlaylist]);

  // ── Core: activate (load + play) a song ──────────────
  const activateSong = useCallback(async (song: Song) => {
    setCurrentSong(song);
    setCurrentTime(0);
    setDuration(song.duration || 0);

    if (song.source === 'youtube') {
      // Stop local audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      const yt = ytPlayerRef.current;
      if (yt && song.videoId) {
        try {
          yt.loadVideoById(song.videoId, 0);
          setIsPlaying(true);
        } catch (e) {
          console.error('YT loadVideoById error', e);
        }
      }
    } else {
      // Stop YouTube
      try { ytPlayerRef.current?.pauseVideo(); } catch { /* ignore */ }

      const blobUrl = blobMap.get(song.id);
      const audio = audioRef.current;
      if (!audio) return;

      if (blobUrl) {
        audio.src = blobUrl;
        audio.load();
        try {
          await audio.play();
        } catch (e) {
          console.error('Audio play error', e);
        }
      } else {
        console.warn('No blob URL found for local song', song.id);
      }
    }
  }, [blobMap]);

  // ── playSong: jump in backend + activate ──────────────
  const playSong = useCallback(async (song: Song) => {
    try {
      const result = await api.jumpTo(song.id);
      setPlaylist(result.playlist);
      await activateSong(song);
    } catch (e) {
      console.error('playSong error', e);
    }
  }, [activateSong]);

  // ── togglePlay ────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!currentSong) return;

    if (currentSong.source === 'youtube') {
      const yt = ytPlayerRef.current;
      if (!yt) return;
      if (isPlaying) {
        yt.pauseVideo();
        api.pause().catch(() => undefined);
      } else {
        yt.playVideo();
        api.play().catch(() => undefined);
      }
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        api.pause().catch(() => undefined);
      } else {
        audio.play().catch(e => console.error(e));
        api.play().catch(() => undefined);
      }
    }
  }, [currentSong, isPlaying]);

  // ── seek ──────────────────────────────────────────────
  const seek = useCallback((seconds: number) => {
    if (currentSong?.source === 'youtube') {
      ytPlayerRef.current?.seekTo(seconds, true);
      setCurrentTime(seconds);
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = seconds;
        setCurrentTime(seconds);
      }
    }
  }, [currentSong?.source]);

  // ── nextSong ──────────────────────────────────────────
  const nextSong = useCallback(async () => {
    try {
      const result = await api.nextSong();
      setPlaylist(result.playlist);
      await activateSong(result.song);
    } catch { /* end of list */ }
  }, [activateSong]);

  // ── prevSong ──────────────────────────────────────────
  const prevSong = useCallback(async () => {
    try {
      const result = await api.previousSong();
      setPlaylist(result.playlist);
      await activateSong(result.song);
    } catch { /* start of list */ }
  }, [activateSong]);

  // ── setVolume ─────────────────────────────────────────
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    try { ytPlayerRef.current?.setVolume(Math.round(clamped * 100)); } catch { /* ignore */ }
  }, []);

  // ── blob management ───────────────────────────────────
  const registerBlob = useCallback((songId: string, blobUrl: string) => {
    setBlobMap(prev => new Map(prev).set(songId, blobUrl));
  }, []);

  const revokeBlob = useCallback((songId: string) => {
    setBlobMap(prev => {
      const next = new Map(prev);
      const url = next.get(songId);
      if (url) URL.revokeObjectURL(url);
      next.delete(songId);
      return next;
    });
  }, []);

  return (
    <PlayerCtx.Provider value={{
      playlist, currentSong, isPlaying, currentTime, duration,
      volume, ytReady, blobMap,
      playSong, togglePlay, seek, nextSong, prevSong, setVolume,
      refreshPlaylist, registerBlob, revokeBlob,
      ytContainerRef,
    }}>
      {children}
    </PlayerCtx.Provider>
  );
}
