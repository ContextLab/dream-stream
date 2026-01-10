import { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView, VideoPlayerStatus } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { getMuxStreamUrl } from '@/services/mux';
import { colors, spacing } from '@/theme/tokens';

interface DreamPlayerProps {
  playbackId: string;
  initialPosition?: number;
  autoPlay?: boolean;
  onProgress?: (positionSeconds: number) => void;
  onStatusChange?: (status: VideoPlayerStatus) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function DreamPlayer({
  playbackId,
  initialPosition = 0,
  autoPlay = false,
  onProgress,
  onStatusChange,
  onComplete,
  onError,
}: DreamPlayerProps) {
  const videoSource = getMuxStreamUrl(playbackId);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCompletedRef = useRef(false);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    if (initialPosition > 0) {
      p.currentTime = initialPosition;
    }
    if (autoPlay) {
      p.play();
    }
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEventListener(player, 'statusChange', ({ status: newStatus, error }) => {
    onStatusChange?.(newStatus);
    if (error) {
      onError?.(new Error(error.message));
    }
  });

  useEffect(() => {
    if (isPlaying && onProgress) {
      progressIntervalRef.current = setInterval(() => {
        const currentTime = player.currentTime;
        const duration = player.duration;
        
        onProgress(currentTime);

        if (duration > 0 && currentTime >= duration - 0.5 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
      }, 1000);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, onProgress, onComplete, player]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying, player]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.currentTime = seconds;
    },
    [player]
  );

  const seekRelative = useCallback(
    (delta: number) => {
      const newTime = Math.max(0, Math.min(player.currentTime + delta, player.duration));
      player.currentTime = newTime;
    },
    [player]
  );

  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isReady = status === 'readyToPlay';

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
        nativeControls={false}
      />
      
      <Pressable style={styles.overlay} onPress={togglePlayPause}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        )}

        {isReady && !isPlaying && !isLoading && (
          <View style={styles.playButton}>
            <Ionicons name="play" size={48} color="#ffffff" />
          </View>
        )}
      </Pressable>
    </View>
  );
}

export { DreamPlayer as default };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 6,
  },
});
