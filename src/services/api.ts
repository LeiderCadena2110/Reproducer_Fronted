// ============================================================
// services/api.ts – API communication layer
// ============================================================

import axios, { AxiosError } from 'axios';
import {
  ApiResponse,
  PlaylistState,
  Song,
  AddSongPayload,
  YouTubeSearchResult,
} from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

const http = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

/** Unwraps ApiResponse, throws a clean Error on failure */
async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const res = await promise;
    if (!res.data.success) throw new Error(res.data.error ?? 'Unknown error');
    return res.data.data as T;
  } catch (err) {
    if (err instanceof AxiosError) {
      const msg = (err.response?.data as ApiResponse)?.error ?? err.message;
      throw new Error(msg);
    }
    throw err;
  }
}

export const api = {
  // ── Playlist ──────────────────────────────────────────
  getPlaylist: () => unwrap<PlaylistState>(http.get('/playlist')),

  addSong: (payload: AddSongPayload) =>
    unwrap<{ song: Song; playlist: PlaylistState }>(http.post('/playlist/songs', payload)),

  deleteSong: (id: string) => unwrap<PlaylistState>(http.delete(`/playlist/songs/${id}`)),

  nextSong: () =>
    unwrap<{ song: Song; playlist: PlaylistState }>(http.post('/playlist/next')),

  previousSong: () =>
    unwrap<{ song: Song; playlist: PlaylistState }>(http.post('/playlist/previous')),

  jumpTo: (id: string) =>
    unwrap<{ song: Song; playlist: PlaylistState }>(http.post(`/playlist/jump/${id}`)),

  play: () => unwrap<unknown>(http.post('/playlist/play')),
  pause: () => unwrap<unknown>(http.post('/playlist/pause')),
  shuffle: () => unwrap<PlaylistState>(http.post('/playlist/shuffle')),
  clearPlaylist: () => unwrap<unknown>(http.delete('/playlist')),

  // ── YouTube ───────────────────────────────────────────
  youtubeSearch: (q: string, maxResults = 10) =>
    unwrap<YouTubeSearchResult[]>(http.get('/youtube/search', { params: { q, maxResults } })),

  youtubeStatus: () =>
    unwrap<{ configured: boolean }>(http.get('/youtube/status')),
};
