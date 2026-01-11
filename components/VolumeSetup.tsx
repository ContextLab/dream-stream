import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform, LayoutChangeEvent } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import { storage } from '@/lib/storage';
import { getVolumeWarningMessage, configureAudioSession } from '@/services/volume';

interface VolumeSetupProps {
  onComplete: (volume: number) => void;
  onSkip?: () => void;
  /** Optional URL to a test audio file. If not provided, uses first available dream audio */
  testAudioUrl?: string;
}

const TEST_PHRASES = [
  'You are dreaming. You are aware.',
  'This is a test of your dream volume.',
  'Adjust until you can hear clearly but softly.',
];

// Simple custom slider component (no external dependencies)
function VolumeSlider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
}: {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const handlePress = (e: { nativeEvent: { locationX: number } }) => {
    if (trackWidth === 0) return;
    const x = e.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, x / trackWidth));
    const newValue = minimumValue + percentage * (maximumValue - minimumValue);
    onValueChange(newValue);
  };

  const fillPercentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <Pressable onPress={handlePress} onLayout={handleLayout} style={styles.sliderTrack}>
      <View style={[styles.sliderFill, { width: `${fillPercentage}%` }]} />
      <View style={[styles.sliderThumb, { left: `${fillPercentage}%` }]} />
    </Pressable>
  );
}

const AUDIO_BASE_URL =
  Platform.OS === 'web'
    ? '/dream-stream/audio/dreams'
    : 'https://context-lab.com/dream-stream/audio/dreams';

export function VolumeSetup({ onComplete, onSkip, testAudioUrl }: VolumeSetupProps) {
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volumeWarning, setVolumeWarning] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const effectiveTestUrl = testAudioUrl || `${AUDIO_BASE_URL}/dream-1_combined.opus`;

  useEffect(() => {
    loadSavedVolume();
    return () => {
      cleanup();
    };
  }, []);

  const loadSavedVolume = async () => {
    try {
      const prefs = await storage.getPreferences();
      setVolume(prefs.voiceVolume);
    } catch (e) {
      console.warn('Failed to load saved volume:', e);
    }
  };

  const cleanup = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }
  };

  const playTestAudio = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await configureAudioSession();

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: effectiveTestUrl },
        {
          volume,
          shouldPlay: true,
          positionMillis: 0,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);

      // Auto-stop after 10 seconds for volume test
      setTimeout(async () => {
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            setIsPlaying(false);
          } catch (e) {
            // Ignore
          }
        }
      }, 10000);
    } catch (e) {
      console.warn('Failed to play test audio:', e);
      setError('Could not load test audio. Check your connection.');
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [volume, effectiveTestUrl]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      setIsPlaying(false);
      setCurrentPhrase((prev) => (prev + 1) % TEST_PHRASES.length);
    }
  };

  const stopTestAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (e) {
        // Ignore
      }
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = async (value: number) => {
    setVolume(value);
    setVolumeWarning(getVolumeWarningMessage(value));
    if (soundRef.current) {
      try {
        await soundRef.current.setVolumeAsync(value);
      } catch (e) {
        // Ignore
      }
    }
  };

  const handleComplete = async () => {
    await cleanup();
    try {
      await storage.setPreferences({ voiceVolume: volume });
    } catch (e) {
      console.warn('Failed to save volume preference:', e);
    }
    onComplete(volume);
  };

  const handleSkip = async () => {
    await cleanup();
    onSkip?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="volume-medium" size={48} color={colors.primary[400]} />
        <Text variant="h3" weight="bold" color="primary" style={styles.title}>
          Set Your Dream Volume
        </Text>
        <Text variant="body" color="secondary" align="center" style={styles.description}>
          Adjust the volume so it's audible but won't wake you. This volume will be locked during
          playback.
        </Text>
      </View>

      <View style={styles.testSection}>
        <Text variant="bodySmall" color="muted" align="center" style={styles.phrase}>
          "{TEST_PHRASES[currentPhrase]}"
        </Text>

        <Pressable
          style={[
            styles.playButton,
            isPlaying && styles.playButtonActive,
            isLoading && styles.playButtonLoading,
          ]}
          onPress={isPlaying ? stopTestAudio : playTestAudio}
          disabled={isLoading}
        >
          <Ionicons
            name={isLoading ? 'hourglass' : isPlaying ? 'stop' : 'play'}
            size={32}
            color="#ffffff"
          />
        </Pressable>

        <Text variant="caption" color="muted">
          {isLoading
            ? 'Loading audio...'
            : isPlaying
              ? 'Playing test audio...'
              : 'Tap to test volume'}
        </Text>

        {error && (
          <Text variant="caption" color="primary" style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderRow}>
          <Ionicons name="volume-low" size={20} color={colors.gray[500]} />
          <View style={styles.sliderContainer}>
            <VolumeSlider
              value={volume}
              onValueChange={handleVolumeChange}
              minimumValue={0.05}
              maximumValue={1}
            />
          </View>
          <Ionicons name="volume-high" size={20} color={colors.gray[500]} />
        </View>
        <Text variant="bodySmall" color="secondary" align="center">
          Volume: {Math.round(volume * 100)}%
        </Text>
        {volumeWarning && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={16} color={colors.warning} />
            <Text variant="caption" style={{ color: colors.warning }}>
              {volumeWarning}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tips}>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text variant="caption" color="secondary">
            Should be barely audible in a quiet room
          </Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text variant="caption" color="secondary">
            Test with your pillow speaker or headphones
          </Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text variant="caption" color="secondary">
            Volume will be locked during sleep playback
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <Button variant="primary" onPress={handleComplete} style={styles.confirmButton}>
          Confirm Volume
        </Button>
        {onSkip && (
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text variant="bodySmall" color="muted">
              Skip for now
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  testSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  phrase: {
    fontStyle: 'italic',
    maxWidth: 280,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.error,
  },
  playButtonLoading: {
    backgroundColor: colors.gray[600],
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
  },
  sliderSection: {
    marginBottom: spacing.xl,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: borderRadius.md,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: colors.gray[700],
    borderRadius: 4,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[400],
    borderWidth: 2,
    borderColor: '#ffffff',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  tips: {
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttons: {
    alignItems: 'center',
    gap: spacing.md,
  },
  confirmButton: {
    minWidth: 200,
  },
  skipButton: {
    padding: spacing.sm,
  },
});
