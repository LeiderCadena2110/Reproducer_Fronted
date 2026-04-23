/// <reference types="vite/client" />

// ── YouTube IFrame Player API – global type declarations ──

declare global {
  interface YTPlayerOptions {
    width?: number | string;
    height?: number | string;
    videoId?: string;
    playerVars?: {
      autoplay?: 0 | 1;
      controls?: 0 | 1;
      modestbranding?: 0 | 1;
      rel?: 0 | 1;
      iv_load_policy?: 1 | 3;
      playsinline?: 0 | 1;
      fs?: 0 | 1;
      cc_load_policy?: 0 | 1;
      origin?: string;
    };
    events?: {
      onReady?: (event: { target: YTPlayer }) => void;
      onStateChange?: (event: { target: YTPlayer; data: number }) => void;
      onError?: (event: { target: YTPlayer; data: number }) => void;
    };
  }

  interface YTPlayer {
    loadVideoById(videoId: string, startSeconds?: number): void;
    cueVideoById(videoId: string, startSeconds?: number): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    destroy(): void;
  }

  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: {
      Player: new (elementId: string | HTMLElement, options: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
  }
}

export {};
