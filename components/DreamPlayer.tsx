import { useEffect, useRef, useCallback, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Image, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { 
  isWebSpeechAvailable, 
  speakWithWebSpeech, 
  stopWebSpeech,
  buildAudioTimeline,
  getTotalDuration,
  type AudioSegment,
} from '@/services/tts';
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
  onSegmentChange?: (segment: AudioSegment | null) => void;
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
  onSegmentChange,
}: DreamPlayerProps) {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(dream.full_duration_seconds);
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCompletedRef = useRef(false);
  const timelineRef = useRef<AudioSegment[]>([]);
  const currentSegmentIndexRef = useRef(0);
  const isWebSpeechActiveRef = useRef(false);

  useEffect(() => {
    const content = playbackMode === 'preview' ? dream.summary : dream.content;
    timelineRef.current = buildAudioTimeline(content);
    setDuration(getTotalDuration(timelineRef.current));
    
    setupAudio();
    
    return () => {
      cleanup();
    };
  }, [dream.id, playbackMode]);

  const setupAudio = async () => {
    setStatus('loading');
    onStatusChange?.('loading');

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      setStatus('ready');
      onStatusChange?.('ready');

      if (autoPlay) {
        play();
      }
    } catch (err) {
      console.error('Audio setup failed:', err);
      setStatus('error');
      onStatusChange?.('error');
      onError?.(err instanceof Error ? err : new Error('Audio setup failed'));
    }
  };

  const cleanup = async () => {
    stopProgressTracking();
    stopWebSpeech();
    isWebSpeechActiveRef.current = false;
    
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const startProgressTracking = () => {
    stopProgressTracking();
    
    progressIntervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 1;
        onProgress?.(newTime);

        const currentSegment = getCurrentSegment(newTime);
        onSegmentChange?.(currentSegment);

        if (newTime >= duration && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          pause();
          onComplete?.();
        }

        return newTime;
      });
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const getCurrentSegment = (time: number): AudioSegment | null => {
    return timelineRef.current.find(
      seg => time >= seg.startTime && time < seg.endTime
    ) || null;
  };

  const play = useCallback(async () => {
    if (status === 'error') return;

    setIsPlaying(true);
    setStatus('playing');
    onStatusChange?.('playing');
    startProgressTracking();

    if (Platform.OS === 'web' && isWebSpeechAvailable()) {
      playWithWebSpeech();
    }
  }, [status]);

  const playWithWebSpeech = async () => {
    if (isWebSpeechActiveRef.current) return;
    isWebSpeechActiveRef.current = true;

    const narrationSegments = timelineRef.current.filter(s => s.type === 'narration');
    
    for (let i = currentSegmentIndexRef.current; i < narrationSegments.length; i++) {
      if (!isWebSpeechActiveRef.current) break;
      
      const segment = narrationSegments[i];
      if (segment.text) {
        try {
          await speakWithWebSpeech(segment.text, { 
            rate: playbackMode === 'dream' ? 0.75 : 0.85 
          });
        } catch (err) {
          console.warn('Web speech error:', err);
        }
      }
      
      currentSegmentIndexRef.current = i + 1;

      const pauseAfter = timelineRef.current.find(
        s => s.type === 'pause' && s.startTime >= segment.endTime
      );
      if (pauseAfter && playbackMode === 'dream') {
        await new Promise(resolve => setTimeout(resolve, (pauseAfter.endTime - pauseAfter.startTime) * 1000));
      }
    }

    if (isWebSpeechActiveRef.current) {
      hasCompletedRef.current = true;
      pause();
      onComplete?.();
    }
  };

  const pause = useCallback(() => {
    setIsPlaying(false);
    setStatus('paused');
    onStatusChange?.('paused');
    stopProgressTracking();
    stopWebSpeech();
    isWebSpeechActiveRef.current = false;
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((seconds: number) => {
    setCurrentTime(Math.max(0, Math.min(seconds, duration)));
    hasCompletedRef.current = false;
  }, [duration]);

  const seekRelative = useCallback((delta: number) => {
    seekTo(currentTime + delta);
  }, [currentTime, seekTo]);

  const isLoading = status === 'loading';
  const isReady = status === 'ready' || status === 'paused';
  const showPlayButton = isReady && !isPlaying && !isLoading;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentSegment = getCurrentSegment(currentTime);
  const isPauseSegment = currentSegment?.type === 'pause';

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: dream.artwork_url }}
        style={styles.artwork}
        resizeMode="cover"
      />

      <View style={styles.overlay}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        )}

        <Pressable style={styles.controlArea} onPress={togglePlayPause}>
          {showPlayButton && (
            <View style={styles.playButton}>
              <Ionicons name="play" size={48} color="#ffffff" />
            </View>
          )}

          {isPlaying && (
            <View style={styles.playingIndicator}>
              <View style={styles.pulseRing} />
              <Ionicons name="pause" size={32} color="#ffffff" />
            </View>
          )}
        </Pressable>

        {isPauseSegment && playbackMode === 'dream' && (
          <View style={styles.pauseOverlay}>
            <Text variant="h4" color="primary" align="center">
              Exploration Pause
            </Text>
            <Text variant="bodySmall" color="secondary" align="center" style={styles.pauseHint}>
              Let your mind wander freely...
            </Text>
          </View>
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentTime / duration) * 100}%` }
              ]} 
            />
          </View>
          <View style={styles.timeRow}>
            <Text variant="caption" color="secondary">{formatTime(currentTime)}</Text>
            <Text variant="caption" color="secondary">{formatTime(duration)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export { DreamPlayer as default };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#09090b',
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlArea: {
    flex: 1,
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
  playingIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  pauseOverlay: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: 12,
  },
  pauseHint: {
    marginTop: spacing.xs,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
