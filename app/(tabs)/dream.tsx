import { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Text, Heading } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { VolumeSetup } from '@/components/VolumeSetup';
import { useSleepTracking } from '@/hooks/useSleepTracking';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';
import {
  getSleepStageDisplayName,
  getSleepStageColor,
  onRemStart,
  onRemEnd,
} from '@/services/sleep';
import { storage } from '@/lib/storage';
import { fadeOut } from '@/services/volume';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { Dream } from '@/types/database';

export default function DreamScreen() {
  const router = useRouter();
  const { currentStage, isTracking, start, stop } = useSleepTracking();
  const { queue, getNext, complete } = useLaunchQueue();

  const [showVolumeSetup, setShowVolumeSetup] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const remUnsubscribeRef = useRef<(() => void) | null>(null);
  const remEndUnsubscribeRef = useRef<(() => void) | null>(null);
  const currentQueueIdRef = useRef<string | null>(null);
  const volumeRef = useRef(0.3);

  useEffect(() => {
    loadVolume();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isTracking) {
      remUnsubscribeRef.current = onRemStart(handleRemStart);
      remEndUnsubscribeRef.current = onRemEnd(handleRemEnd);
    }

    return () => {
      if (remUnsubscribeRef.current) {
        remUnsubscribeRef.current();
        remUnsubscribeRef.current = null;
      }
      if (remEndUnsubscribeRef.current) {
        remEndUnsubscribeRef.current();
        remEndUnsubscribeRef.current = null;
      }
    };
  }, [isTracking, queue]);

  const loadVolume = async () => {
    const prefs = await storage.getPreferences();
    volumeRef.current = prefs.voiceVolume;
  };

  const cleanup = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  const handleRemStart = async () => {
    console.log('[Dream] REM detected - starting playback');
    if (isPlaying) return;

    const nextItem = await getNext();
    if (nextItem) {
      currentQueueIdRef.current = nextItem.id;
      await playDream(nextItem.dream);
    }
  };

  const handleRemEnd = async () => {
    console.log('[Dream] REM ended - stopping playback');
    if (soundRef.current && isPlaying) {
      try {
        await fadeOut(soundRef.current, volumeRef.current, 3000);
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (err) {
        console.warn('Failed to fade out:', err);
      }
    }
  };

  const playDream = async (dream: Dream) => {
    try {
      await cleanup();

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const baseUrl = (() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const origin = window.location.origin;
          const basePath = window.location.pathname.includes('/dream-stream')
            ? '/dream-stream'
            : '';
          return `${origin}${basePath}/audio/dreams`;
        }
        return 'https://context-lab.com/dream-stream/audio/dreams';
      })();
      const audioUrl = `${baseUrl}/${dream.id}_combined.opus`;

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: volumeRef.current },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentDream(dream);
      setIsPlaying(true);

      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }
    } catch (err) {
      console.warn('Failed to play dream:', err);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const onPlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.positionMillis && status.durationMillis) {
      setProgress(status.positionMillis / status.durationMillis);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setProgress(0);

      if (currentQueueIdRef.current) {
        try {
          await complete(currentQueueIdRef.current);
        } catch {}
        currentQueueIdRef.current = null;
      }
      setCurrentDream(null);
    }
  };

  const handleStartTracking = useCallback(() => {
    if (queue.length === 0) {
      Alert.alert(
        'No Dreams Queued',
        'Add some dreams to your queue first, then come back to start sleep tracking.',
        [
          { text: 'Browse Dreams', onPress: () => router.push('/(tabs)') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    setShowVolumeSetup(true);
  }, [queue.length, router]);

  const handleVolumeComplete = useCallback(
    async (volume: number) => {
      volumeRef.current = volume;
      setShowVolumeSetup(false);
      try {
        await start('audio');
      } catch {
        Alert.alert(
          'Error',
          'Failed to start sleep tracking. Please ensure microphone access is enabled.'
        );
      }
    },
    [start]
  );

  const handleStopTracking = useCallback(async () => {
    const doStop = async () => {
      try {
        await cleanup();
        setIsPlaying(false);
        setCurrentDream(null);
        const summary = await stop();
        if (summary) {
          Alert.alert(
            'Sleep Summary',
            `Total: ${summary.totalDurationMinutes} mins\nREM: ${summary.remMinutes} mins (${summary.remPercentage}%)`
          );
        }
      } catch (err) {
        console.error('Failed to stop sleep tracking:', err);
        Alert.alert('Error', 'Failed to stop sleep tracking');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Stop Sleep Tracking?\n\nAre you sure you want to stop?')) {
        await doStop();
      }
    } else {
      Alert.alert('Stop Sleep Tracking', 'Are you sure you want to stop?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: doStop },
      ]);
    }
  }, [stop, cleanup]);

  const handleManualPlay = async () => {
    if (isPlaying) {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    } else {
      const nextItem = await getNext();
      if (nextItem) {
        currentQueueIdRef.current = nextItem.id;
        await playDream(nextItem.dream);
      } else {
        Alert.alert('Queue Empty', 'Add dreams to your queue first.');
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">
            Dream
          </Heading>
          <Text variant="caption" color="muted">
            {queue.length} {queue.length === 1 ? 'dream' : 'dreams'} in queue
          </Text>
        </View>

        <View style={styles.mainSection}>
          {isTracking ? (
            <View style={styles.trackingActive}>
              <View style={styles.statusRow}>
                <View style={styles.pulsingDot} />
                <Text variant="body" weight="medium" color="primary">
                  Sleep Tracking Active
                </Text>
              </View>

              {currentStage && (
                <View style={styles.stageDisplay}>
                  <Text variant="caption" color="muted">
                    Current Stage
                  </Text>
                  <View
                    style={[
                      styles.stageBadge,
                      { backgroundColor: `${getSleepStageColor(currentStage)}20` },
                    ]}
                  >
                    <View
                      style={[
                        styles.stageDot,
                        { backgroundColor: getSleepStageColor(currentStage) },
                      ]}
                    />
                    <Text
                      variant="h4"
                      weight="bold"
                      style={{ color: getSleepStageColor(currentStage) }}
                    >
                      {getSleepStageDisplayName(currentStage)}
                    </Text>
                  </View>
                </View>
              )}

              {currentDream && (
                <View style={styles.nowPlaying}>
                  <Text variant="caption" color="muted">
                    Now Playing
                  </Text>
                  <Text variant="body" weight="semibold" color="primary">
                    {currentDream.title}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text variant="caption" color="muted">
                      {formatTime(progress * duration)} / {formatTime(duration)}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.controlsRow}>
                <Pressable style={styles.playButton} onPress={handleManualPlay}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#ffffff" />
                </Pressable>
              </View>

              <Text variant="caption" color="muted" align="center" style={styles.hint}>
                {currentStage === 'rem'
                  ? 'REM detected - dream audio playing'
                  : 'Waiting for REM sleep to play dreams...'}
              </Text>

              <Button variant="outline" onPress={handleStopTracking} style={styles.stopButton}>
                Stop Tracking
              </Button>
            </View>
          ) : (
            <View style={styles.trackingInactive}>
              <Ionicons name="moon" size={80} color={colors.primary[500]} />
              <Text variant="h3" weight="bold" color="primary" style={styles.inactiveTitle}>
                Ready to Dream
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.inactiveDesc}>
                Start sleep tracking to automatically play your queued dreams during REM sleep
              </Text>

              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="mic-outline" size={20} color={colors.primary[400]} />
                  <Text variant="bodySmall" color="secondary">
                    Detects sleep stages via microphone
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="moon-outline" size={20} color={colors.primary[400]} />
                  <Text variant="bodySmall" color="secondary">
                    Plays dreams during REM sleep
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="pause-outline" size={20} color={colors.primary[400]} />
                  <Text variant="bodySmall" color="secondary">
                    Pauses when REM ends
                  </Text>
                </View>
              </View>

              <Button variant="primary" onPress={handleStartTracking} style={styles.startButton}>
                Start Sleep Tracking
              </Button>

              {queue.length === 0 && (
                <Pressable onPress={() => router.push('/(tabs)')}>
                  <Text variant="bodySmall" color="primary" style={styles.browseLink}>
                    Browse dreams to add to queue
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showVolumeSetup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVolumeSetup(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowVolumeSetup(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[400]} />
            </Pressable>
          </View>
          <VolumeSetup
            onComplete={handleVolumeComplete}
            onSkip={() => {
              setShowVolumeSetup(false);
              start('audio').catch(() => {
                Alert.alert(
                  'Error',
                  'Failed to start sleep tracking. Please ensure microphone access is enabled.'
                );
              });
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  mainSection: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  trackingActive: {
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  stageDisplay: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nowPlaying: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  progressContainer: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray[700],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
  },
  controlsRow: {
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    maxWidth: 280,
    alignSelf: 'center',
  },
  stopButton: {
    marginTop: spacing.md,
  },
  trackingInactive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  inactiveTitle: {
    marginTop: spacing.md,
  },
  inactiveDesc: {
    maxWidth: 300,
  },
  featureList: {
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginVertical: spacing.lg,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  startButton: {
    minWidth: 200,
  },
  browseLink: {
    marginTop: spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  closeButton: {
    padding: spacing.sm,
  },
});
