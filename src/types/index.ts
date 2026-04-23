// ============================================================
// types/index.ts – Shared types for MusicFlow frontend
// ============================================================

export type SongSource = 'local' | 'youtube';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  coverUrl: string;
  addedAt: string;
  source: SongSource;
  videoId?: string;
}

export interface PlaylistState {
  songs: Song[];
  currentIndex: number | null;
  totalSongs: number;
  isPlaying: boolean;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type InsertPosition = 'start' | 'end' | number;

export interface AddSongPayload {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  genre?: string;
  coverUrl?: string;
  position?: InsertPosition;
  source?: SongSource;
  videoId?: string;
}

export interface LocalFileEntry {
  file: File;
  blobUrl: string;
  title: string;
  artist: string;
  duration: number;
  songId?: string; // set after added to backend playlist
}
