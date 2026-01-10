import { useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { colors, spacing, touchTargetMinSize } from '@/theme/tokens';

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSeekRelative: (delta: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSeekRelative,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleSeekBackward = useCallback(() => {
    onSeekRelative(-10);
  }, [onSeekRelative]);

  const handleSeekForward = useCallback(() => {
    onSeekRelative(10);
  }, [onSeekRelative]);

  const handleProgressBarPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      const { locationX } = event.nativeEvent;
      const barWidth = 300;
      const seekRatio = Math.max(0, Math.min(1, locationX / barWidth));
      onSeek(seekRatio * duration);
    },
    [duration, onSeek]
  );

  return (
    <View style={styles.container}>
      <View style={styles.timeRow}>
        <Text variant="caption" color="secondary">
          {formatTime(currentTime)}
        </Text>
        <Text variant="caption" color="secondary">
          {formatTime(duration)}
        </Text>
      </View>

      <Pressable onPress={handleProgressBarPress} style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </Pressable>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={handleSeekBackward}
          style={styles.controlButton}
          hitSlop={8}
          accessibilityLabel="Seek backward 10 seconds"
        >
          <Ionicons name="play-back" size={28} color={colors.gray[300]} />
          <Text variant="caption" color="muted" style={styles.seekLabel}>
            10
          </Text>
        </Pressable>

        <Pressable
          onPress={onPlayPause}
          style={styles.playPauseButton}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={36}
            color="#ffffff"
            style={isPlaying ? undefined : styles.playIcon}
          />
        </Pressable>

        <Pressable
          onPress={handleSeekForward}
          style={styles.controlButton}
          hitSlop={8}
          accessibilityLabel="Seek forward 10 seconds"
        >
          <Ionicons name="play-forward" size={28} color={colors.gray[300]} />
          <Text variant="caption" color="muted" style={styles.seekLabel}>
            10
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressBarContainer: {
    height: touchTargetMinSize,
    justifyContent: 'center',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.gray[700],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing['2xl'],
  },
  controlButton: {
    alignItems: 'center',
    minWidth: touchTargetMinSize,
    minHeight: touchTargetMinSize,
    justifyContent: 'center',
  },
  seekLabel: {
    fontSize: 10,
    marginTop: -4,
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 4,
  },
});
