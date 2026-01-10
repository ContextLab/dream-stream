import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Vibration, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';
import type { Dream } from '@/types/database';

interface SleepModePlayerProps {
  dream: Dream;
  onComplete?: () => void;
  onStop?: () => void;
  enableHaptics?: boolean;
}

const HAPTIC_PATTERN_GENTLE = [0, 100, 200, 100];
const HAPTIC_PATTERN_PULSE = [0, 50, 100, 50, 100, 50];

export function SleepModePlayer({
  dream,
  onComplete,
  onStop,
  enableHaptics = true,
}: SleepModePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(dream.full_duration_seconds);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    setupAudio();
    return () => {
      cleanup();
    };
  }, [dream.id]);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const baseUrl = Platform.OS === 'web' 
        ? '/dream-stream/audio/dreams'
        : 'https://context-lab.com/dream-stream/audio/dreams';
      const audioUrl = `${baseUrl}/${dream.id}_full.opus`;
      
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }
      );

      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
      
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }
    } catch (err) {
      console.warn('Failed to setup audio:', err);
    }
  };

  const cleanup = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    cancelAnimation(pulseScale);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.positionMillis && status.durationMillis) {
      setProgress(status.positionMillis / status.durationMillis);
    }

    if (status.didJustFinish) {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsPlaying(false);
    cancelAnimation(pulseScale);
    
    if (enableHaptics && Platform.OS !== 'web') {
      Vibration.vibrate(HAPTIC_PATTERN_PULSE);
    }
    
    onComplete?.();
  };

  const startPulseAnimation = () => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  };

  const handlePlay = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      startPulseAnimation();

      if (enableHaptics && Platform.OS !== 'web') {
        Vibration.vibrate(HAPTIC_PATTERN_GENTLE);
      }
    } catch (err) {
      console.warn('Failed to play audio:', err);
    }
  };

  const handlePause = async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 300 });
    } catch (err) {
      console.warn('Failed to pause audio:', err);
    }
  };

  const handleStop = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
    }
    setIsPlaying(false);
    setProgress(0);
    cancelAnimation(pulseScale);
    pulseScale.value = withTiming(1, { duration: 300 });
    onStop?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = duration * progress;
  const remainingTime = duration - currentTime;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.visualizer, animatedStyle]}>
        <View style={styles.innerCircle}>
          <Ionicons
            name={isPlaying ? 'moon' : 'moon-outline'}
            size={48}
            color={colors.primary[400]}
          />
        </View>
      </Animated.View>

      <Text variant="h3" weight="semibold" align="center" style={styles.title}>
        {dream.title}
      </Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text variant="caption" color="secondary">
            {formatTime(currentTime)}
          </Text>
          <Text variant="caption" color="secondary">
            -{formatTime(remainingTime)}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={handleStop}>
          <Ionicons name="stop" size={24} color="#ffffff" />
        </Pressable>

        <Pressable
          style={[styles.mainButton, isPlaying && styles.mainButtonPlaying]}
          onPress={isPlaying ? handlePause : handlePlay}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="#ffffff"
          />
        </Pressable>

        <View style={styles.controlButton}>
          <Ionicons
            name={enableHaptics ? 'hand-left' : 'hand-left-outline'}
            size={24}
            color={enableHaptics ? colors.primary[400] : colors.gray[500]}
          />
        </View>
      </View>

      {isPlaying && (
        <Text variant="caption" color="secondary" align="center" style={styles.hint}>
          Playing in sleep mode...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  visualizer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    marginBottom: spacing.lg,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.gray[700],
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
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonPlaying: {
    backgroundColor: colors.primary[600],
  },
  hint: {
    marginTop: spacing.sm,
  },
});
