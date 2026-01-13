import { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';
import type { Dream, PlaybackMode } from '@/types/database';

type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

interface DreamPlayerProps {
  dream: Dream;
  playbackMode?: PlaybackMode;
  initialPosition?: number;
  autoPlay?: boolean;
  onProgress?: (positionSeconds: number) => void;
  onStatusChange?: (status: PlayerStatus) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

function getAudioUrl(dreamId: string): string {
  const baseUrl =
    Platform.OS === 'web'
      ? '/dream-stream/audio/dreams'
      : 'https://context-lab.com/dream-stream/audio/dreams';
  return `${baseUrl}/${dreamId}_combined.opus`;
}

export function DreamPlayer({
  dream,
  playbackMode = 'full',
  initialPosition = 0,
  autoPlay = false,
  onProgress,
  onStatusChange,
  onComplete,
  onError,
}: DreamPlayerProps) {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(
    playbackMode === 'preview' ? dream.preview_duration_seconds : dream.full_duration_seconds
  );

  const soundRef = useRef<Audio.Sound | null>(null);
  const hasCompletedRef = useRef(false);
  const playbackModeRef = useRef(playbackMode);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    loadAudio();

    return () => {
      cleanup();
    };
  }, [dream.id, playbackMode]);

  const loadAudio = async () => {
    setStatus('loading');
    onStatusChange?.('loading');

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const audioUrl = getAudioUrl(dream.id);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: autoPlay, positionMillis: initialPosition * 1000 },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setStatus('ready');
      onStatusChange?.('ready');

      if (autoPlay) {
        setIsPlaying(true);
        setStatus('playing');
        onStatusChange?.('playing');
      }
    } catch (err) {
      console.error('Audio load failed:', err);
      setStatus('error');
      onStatusChange?.('error');
      onError?.(err instanceof Error ? err : new Error('Failed to load audio'));
    }
  };

  const onPlaybackStatusUpdate = async (playbackStatus: AVPlaybackStatus) => {
    if (!playbackStatus.isLoaded) {
      if (playbackStatus.error) {
        console.error('Playback error:', playbackStatus.error);
        setStatus('error');
        onError?.(new Error(playbackStatus.error));
      }
      return;
    }

    const positionSec = playbackStatus.positionMillis / 1000;
    const fileDurationSec = playbackStatus.durationMillis
      ? Math.floor(playbackStatus.durationMillis / 1000)
      : duration;
    const isPreview = playbackModeRef.current === 'preview';
    const previewDuration = dream.preview_duration_seconds;
    const effectiveDuration = isPreview ? previewDuration : fileDurationSec;

    setCurrentTime(Math.min(Math.floor(positionSec), effectiveDuration));
    setDuration(effectiveDuration);
    setIsPlaying(playbackStatus.isPlaying);
    onProgress?.(Math.floor(positionSec));

    if (isPreview && soundRef.current) {
      const FADE_DURATION = 5;
      const timeRemaining = previewDuration - positionSec;

      if (timeRemaining <= FADE_DURATION && timeRemaining > 0) {
        const volume = timeRemaining / FADE_DURATION;
        await soundRef.current.setVolumeAsync(volume);
      } else if (timeRemaining > FADE_DURATION) {
        await soundRef.current.setVolumeAsync(1.0);
      }

      if (positionSec >= previewDuration) {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          await soundRef.current.pauseAsync();
          await soundRef.current.setPositionAsync(0);
          await soundRef.current.setVolumeAsync(1.0);
          setIsPlaying(false);
          setCurrentTime(0);
          setStatus('paused');
          onComplete?.();
        }
        return;
      }
    }

    if (playbackStatus.didJustFinish && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      setIsPlaying(false);
      setStatus('paused');
      onComplete?.();
    }
  };

  const cleanup = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const play = useCallback(async () => {
    if (!soundRef.current || status === 'error') return;

    try {
      await soundRef.current.setVolumeAsync(1.0);
      await soundRef.current.playAsync();
      setIsPlaying(true);
      setStatus('playing');
      onStatusChange?.('playing');
      hasCompletedRef.current = false;
    } catch (err) {
      console.error('Play failed:', err);
    }
  }, [status]);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      setStatus('paused');
      onStatusChange?.('paused');
    } catch (err) {
      console.error('Pause failed:', err);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback(
    async (seconds: number) => {
      if (!soundRef.current) return;

      try {
        const maxPosition =
          playbackModeRef.current === 'preview' ? dream.preview_duration_seconds : duration;
        const clampedSeconds = Math.min(seconds, maxPosition);
        await soundRef.current.setPositionAsync(clampedSeconds * 1000);
        setCurrentTime(clampedSeconds);
        hasCompletedRef.current = false;
      } catch (err) {
        console.error('Seek failed:', err);
      }
    },
    [dream.preview_duration_seconds, duration]
  );

  const seekRelative = useCallback(
    (delta: number) => {
      const newTime = Math.max(0, Math.min(currentTime + delta, duration));
      seekTo(newTime);
    },
    [currentTime, duration, seekTo]
  );

  const isLoading = status === 'loading';
  const hasError = status === 'error';

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.visualizer}>
        <Ionicons
          name={isPlaying ? 'radio' : 'radio-outline'}
          size={64}
          color={isPlaying ? colors.primary[500] : colors.gray[600]}
        />
        <Text variant="h4" weight="semibold" style={styles.title} numberOfLines={2}>
          {dream.title}
        </Text>
        {dream.category && (
          <Text variant="caption" color="secondary">
            {dream.category.name}
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
            <Text variant="bodySmall" color="error" style={styles.errorText}>
              Audio not available
            </Text>
            <Text variant="caption" color="muted">
              Pre-generated audio files not yet uploaded
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.progressContainer}>
              <Pressable
                style={styles.progressBar}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  const width = 300;
                  const percent = locationX / width;
                  seekTo(percent * duration);
                }}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' },
                  ]}
                />
              </Pressable>
              <View style={styles.timeRow}>
                <Text variant="caption" color="secondary" style={styles.timeText}>
                  {formatTime(currentTime)}
                </Text>
                <Text variant="caption" color="secondary" style={styles.timeText}>
                  {formatTime(duration)}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <Pressable onPress={() => seekRelative(-15)} style={styles.seekButton}>
                <Ionicons name="play-back" size={24} color={colors.gray[400]} />
                <Text variant="caption" color="muted">
                  15s
                </Text>
              </Pressable>

              <Pressable onPress={togglePlayPause} style={styles.playButton}>
                {isLoading ? (
                  <ActivityIndicator size="large" color={colors.primary[500]} />
                ) : (
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#ffffff" />
                )}
              </Pressable>

              <Pressable onPress={() => seekRelative(15)} style={styles.seekButton}>
                <Ionicons name="play-forward" size={24} color={colors.gray[400]} />
                <Text variant="caption" color="muted">
                  15s
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export { DreamPlayer as default };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.gray[950],
    padding: spacing.lg,
  },
  visualizer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    color: colors.gray[100],
    marginTop: spacing.md,
    textAlign: 'center',
  },
  controls: {
    marginTop: spacing.lg,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    marginTop: spacing.sm,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray[800],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    fontFamily: 'CourierPrime_400Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  seekButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
});
