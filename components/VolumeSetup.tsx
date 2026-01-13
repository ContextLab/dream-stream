import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import { configureAudioSession } from '@/services/volume';

interface VolumeSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

function getTestAudioUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const origin = window.location.origin;
    const basePath = window.location.pathname.includes('/dream-stream') ? '/dream-stream' : '';
    return `${origin}${basePath}/audio/test/volume_test.opus`;
  }
  return 'https://context-lab.com/dream-stream/audio/test/volume_test.opus';
}

export function VolumeSetup({ onComplete, onSkip }: VolumeSetupProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playTestAudio = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await configureAudioSession();

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: getTestAudioUrl() },
        {
          volume: 1.0,
          shouldPlay: true,
          positionMillis: 0,
        },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
      setIsLoading(false);
    } catch (e) {
      console.warn('Failed to play test audio:', e);
      setError('Could not load test audio. Check your connection.');
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, []);

  const stopTestAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
      } catch {
        // Ignore
      }
      setIsPlaying(false);
    }
  }, []);

  const handleComplete = useCallback(async () => {
    await cleanup();
    onComplete();
  }, [cleanup, onComplete]);

  const handleSkip = useCallback(async () => {
    await cleanup();
    onSkip?.();
  }, [cleanup, onSkip]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="volume-medium" size={48} color={colors.primary[400]} />
        <Text variant="h3" weight="bold" color="primary" style={styles.title}>
          Adjust Your Volume
        </Text>
        <Text variant="body" color="secondary" align="center" style={styles.description}>
          Use your device's volume buttons to set a comfortable level for sleep. This is how loud
          your dreams will play.
        </Text>
      </View>

      <View style={styles.testSection}>
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
              ? 'Adjust your device volume now'
              : 'Tap to play test audio'}
        </Text>

        {error && (
          <Text variant="caption" style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>

      <View style={styles.instructions}>
        <View style={styles.instruction}>
          <View style={styles.instructionNumber}>
            <Text variant="body" weight="bold" style={styles.instructionNumberText}>
              1
            </Text>
          </View>
          <Text variant="body" color="secondary" style={styles.instructionText}>
            Tap play to hear the test audio
          </Text>
        </View>
        <View style={styles.instruction}>
          <View style={styles.instructionNumber}>
            <Text variant="body" weight="bold" style={styles.instructionNumberText}>
              2
            </Text>
          </View>
          <Text variant="body" color="secondary" style={styles.instructionText}>
            Use your device's volume buttons to adjust
          </Text>
        </View>
        <View style={styles.instruction}>
          <View style={styles.instructionNumber}>
            <Text variant="body" weight="bold" style={styles.instructionNumberText}>
              3
            </Text>
          </View>
          <Text variant="body" color="secondary" style={styles.instructionText}>
            Set to a level that's audible but won't wake you
          </Text>
        </View>
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
      </View>

      <View style={styles.buttons}>
        <Button variant="primary" onPress={handleComplete} style={styles.confirmButton}>
          Volume is Set
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
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: colors.success,
  },
  playButtonLoading: {
    backgroundColor: colors.gray[600],
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.xs,
  },
  instructions: {
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  instructionText: {
    flex: 1,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    color: colors.gray[950],
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
