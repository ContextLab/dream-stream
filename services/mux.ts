import { API_CONFIG, MUX_TEST_PLAYBACK_ID } from '@/lib/constants';

export interface MuxPlayerConfig {
  playbackId: string;
  envKey: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  thumbnailTime?: number;
}

export function getMuxStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxThumbnailUrl(
  playbackId: string,
  options?: { width?: number; height?: number; time?: number }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.append('width', options.width.toString());
  if (options?.height) params.append('height', options.height.toString());
  if (options?.time) params.append('time', options.time.toString());

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
}

export function getMuxAnimatedGifUrl(
  playbackId: string,
  options?: { width?: number; fps?: number; start?: number; end?: number }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.append('width', options.width.toString());
  if (options?.fps) params.append('fps', options.fps.toString());
  if (options?.start) params.append('start', options.start.toString());
  if (options?.end) params.append('end', options.end.toString());

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/animated.gif${queryString ? `?${queryString}` : ''}`;
}

export function createMuxPlayerConfig(
  playbackId: string,
  options?: Partial<Omit<MuxPlayerConfig, 'playbackId' | 'envKey'>>
): MuxPlayerConfig {
  return {
    playbackId,
    envKey: API_CONFIG.MUX_ENV_KEY || '',
    autoPlay: false,
    muted: false,
    loop: false,
    ...options,
  };
}

export function getTestPlaybackConfig(): MuxPlayerConfig {
  return createMuxPlayerConfig(MUX_TEST_PLAYBACK_ID, {
    autoPlay: false,
    muted: true,
  });
}
