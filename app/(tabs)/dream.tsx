import { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Text, Heading } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useThemedAlert } from '@/components/ui/ThemedAlert';
import { VolumeSetup } from '@/components/VolumeSetup';
import { MicrophoneTest } from '@/components/MicrophoneTest';
import { SleepStageGraph } from '@/components/SleepStageGraph';
import { SleepHistoryCard } from '@/components/SleepHistoryCard';
import { SleepSessionDetailModal } from '@/components/SleepSessionDetailModal';
import { useDarkOverlay } from '@/components/DarkOverlayProvider';
import { useSleepTracking } from '@/hooks/useSleepTracking';
import type { SleepSession } from '@/services/sleep';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';
import {
  getSleepStageDisplayName,
  getSleepStageColor,
  onRemStart,
  onRemEnd,
  onStageHistoryChange,
  type StageHistoryEntry,
} from '@/services/sleep';
import { storage } from '@/lib/storage';
import { fadeOut, configureSleepAudioSession } from '@/services/volume';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { Dream } from '@/types/database';

export default function DreamScreen() {
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const { session, currentStage, isTracking, start, stop, history, deleteSession } =
    useSleepTracking();
  const { queue, getNext, complete } = useLaunchQueue();

  const [showVolumeSetup, setShowVolumeSetup] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SleepSession | null>(null);
  const [showSleepSummary, setShowSleepSummary] = useState(false);
  const [sleepSummaryData, setSleepSummaryData] = useState<{
    total: number;
    rem: number;
    remPct: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([]);
  const { showDarkOverlay, isDarkOverlayVisible } = useDarkOverlay();
  const [helpMeFallAsleep, setHelpMeFallAsleep] = useState(false);
  const [isMeditating, setIsMeditating] = useState(false);
  const [isMeditationPaused, setIsMeditationPaused] = useState(false);
  const [meditationProgress, setMeditationProgress] = useState(0);
  const [meditationDuration, setMeditationDuration] = useState(0);
  const meditationSoundRef = useRef<Audio.Sound | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const remUnsubscribeRef = useRef<(() => void) | null>(null);
  const remEndUnsubscribeRef = useRef<(() => void) | null>(null);
  const stageHistoryUnsubscribeRef = useRef<(() => void) | null>(null);
  const currentQueueIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isTracking) {
      remUnsubscribeRef.current = onRemStart(handleRemStart);
      remEndUnsubscribeRef.current = onRemEnd(handleRemEnd);
      stageHistoryUnsubscribeRef.current = onStageHistoryChange(setStageHistory);
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
      if (stageHistoryUnsubscribeRef.current) {
        stageHistoryUnsubscribeRef.current();
        stageHistoryUnsubscribeRef.current = null;
      }
    };
  }, [isTracking, queue]);

  const cleanup = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    if (meditationSoundRef.current) {
      try {
        await meditationSoundRef.current.unloadAsync();
      } catch {}
      meditationSoundRef.current = null;
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
        await fadeOut(soundRef.current, 1.0, 3000);
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
      await configureSleepAudioSession();

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
        { shouldPlay: true, volume: 1.0 },
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
      showAlert('Error', 'Failed to play audio');
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
      showAlert(
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

  const getMeditationUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const origin = window.location.origin;
      const basePath = window.location.pathname.includes('/dream-stream') ? '/dream-stream' : '';
      return `${origin}${basePath}/audio/meditation/sleep-meditation_full.opus`;
    }
    return 'https://context-lab.com/dream-stream/audio/meditation/sleep-meditation_full.opus';
  };

  const playMeditation = useCallback(
    async (fromPosition?: number) => {
      try {
        await configureSleepAudioSession();

        const { sound, status } = await Audio.Sound.createAsync(
          { uri: getMeditationUrl() },
          {
            shouldPlay: true,
            volume: 1.0,
            positionMillis: fromPosition ?? 0,
          },
          (playbackStatus) => {
            if (!playbackStatus.isLoaded) return;

            if (playbackStatus.durationMillis) {
              setMeditationDuration(playbackStatus.durationMillis / 1000);
            }
            if (playbackStatus.positionMillis && playbackStatus.durationMillis) {
              setMeditationProgress(playbackStatus.positionMillis / playbackStatus.durationMillis);
            }

            if (playbackStatus.didJustFinish) {
              setIsMeditating(false);
              setIsMeditationPaused(false);
              setMeditationProgress(0);
              meditationSoundRef.current = null;
              start('audio').catch(() => {
                showAlert('Error', 'Failed to start sleep tracking.');
              });
            }
          }
        );

        meditationSoundRef.current = sound;
        setIsMeditating(true);
        setIsMeditationPaused(false);
      } catch (err) {
        console.warn('Failed to play meditation:', err);
        start('audio').catch(() => {
          showAlert('Error', 'Failed to start sleep tracking.');
        });
      }
    },
    [start]
  );

  const skipMeditation = useCallback(async () => {
    if (meditationSoundRef.current) {
      try {
        await meditationSoundRef.current.stopAsync();
        await meditationSoundRef.current.unloadAsync();
      } catch {}
      meditationSoundRef.current = null;
    }
    setIsMeditating(false);
    setIsMeditationPaused(false);
    setMeditationProgress(0);
    try {
      await start('audio');
    } catch {
      showAlert('Error', 'Failed to start sleep tracking.');
    }
  }, [start]);

  const toggleMeditationPause = useCallback(async () => {
    if (!meditationSoundRef.current) return;

    try {
      const status = await meditationSoundRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      if (status.isPlaying) {
        await meditationSoundRef.current.pauseAsync();
        setIsMeditationPaused(true);
      } else {
        await meditationSoundRef.current.playAsync();
        setIsMeditationPaused(false);
      }
    } catch (err) {
      console.warn('Failed to toggle meditation pause:', err);
    }
  }, []);

  const restartMeditation = useCallback(async () => {
    if (meditationSoundRef.current) {
      try {
        await meditationSoundRef.current.stopAsync();
        await meditationSoundRef.current.unloadAsync();
      } catch {}
      meditationSoundRef.current = null;
    }
    setMeditationProgress(0);
    setIsMeditationPaused(false);
    await playMeditation();
  }, [playMeditation]);

  const stopMeditation = useCallback(async () => {
    if (meditationSoundRef.current) {
      try {
        await meditationSoundRef.current.stopAsync();
        await meditationSoundRef.current.unloadAsync();
      } catch {}
      meditationSoundRef.current = null;
    }
    setIsMeditating(false);
    setIsMeditationPaused(false);
    setMeditationProgress(0);
  }, []);

  const handleVolumeComplete = useCallback(() => {
    setShowVolumeSetup(false);
    setShowMicTest(true);
  }, []);

  const handleMicTestComplete = useCallback(async () => {
    setShowMicTest(false);

    if (helpMeFallAsleep) {
      await playMeditation();
    } else {
      try {
        await start('audio');
      } catch {
        showAlert(
          'Error',
          'Failed to start sleep tracking. Please ensure microphone access is enabled.'
        );
      }
    }
  }, [start, helpMeFallAsleep, playMeditation]);

  const handleMicTestSkip = useCallback(async () => {
    setShowMicTest(false);

    if (helpMeFallAsleep) {
      await playMeditation();
    } else {
      try {
        await start('audio');
      } catch {
        showAlert(
          'Error',
          'Failed to start sleep tracking. Please ensure microphone access is enabled.'
        );
      }
    }
  }, [start, helpMeFallAsleep, playMeditation]);

  const handleStopTracking = useCallback(async () => {
    const doStop = async () => {
      try {
        await cleanup();
        setIsPlaying(false);
        setCurrentDream(null);
        const summary = await stop();
        if (summary) {
          setSleepSummaryData({
            total: summary.totalDurationMinutes,
            rem: summary.remMinutes,
            remPct: summary.remPercentage,
          });
          setShowSleepSummary(true);
        }
      } catch (err) {
        console.error('Failed to stop sleep tracking:', err);
        showAlert('Error', 'Failed to stop sleep tracking');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Stop Sleep Tracking?\n\nAre you sure you want to stop?')) {
        await doStop();
      }
    } else {
      showAlert('Stop Sleep Tracking', 'Are you sure you want to stop?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: doStop },
      ]);
    }
  }, [stop, cleanup]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      showAlert('Delete Sleep Session', 'Are you sure you want to delete this sleep session?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
          },
        },
      ]);
    },
    [deleteSession]
  );

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
          {isMeditating ? (
            <View style={styles.trackingActive}>
              <View style={styles.statusRow}>
                <View style={[styles.pulsingDot, { backgroundColor: colors.primary[400] }]} />
                <Text variant="body" weight="medium" color="primary">
                  Sleep Meditation
                </Text>
              </View>

              <View style={styles.meditationContent}>
                <Ionicons name="sparkles" size={48} color={colors.primary[400]} />
                <Text variant="h4" weight="semibold" color="primary" align="center">
                  Gentle Journey to Sleep
                </Text>
                <Text variant="body" color="secondary" align="center" style={styles.meditationDesc}>
                  Relax and breathe... Sleep tracking will begin automatically when the meditation
                  ends.
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${meditationProgress * 100}%` }]} />
                </View>
                <Text variant="caption" color="muted">
                  {formatTime(meditationProgress * meditationDuration)} /{' '}
                  {formatTime(meditationDuration)}
                </Text>
              </View>

              <View style={styles.meditationControls}>
                <Pressable style={styles.meditationControlButton} onPress={restartMeditation}>
                  <Ionicons name="refresh" size={24} color={colors.gray[400]} />
                </Pressable>

                <Pressable style={styles.meditationPlayButton} onPress={toggleMeditationPause}>
                  <Ionicons
                    name={isMeditationPaused ? 'play' : 'pause'}
                    size={32}
                    color={colors.primary[400]}
                  />
                </Pressable>

                <Pressable style={styles.meditationControlButton} onPress={skipMeditation}>
                  <Ionicons name="play-skip-forward" size={24} color={colors.gray[400]} />
                </Pressable>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.darkModeButton} onPress={showDarkOverlay}>
                  <Ionicons name="moon" size={20} color={colors.gray[400]} />
                  <Text variant="caption" color="muted">
                    Dark Screen
                  </Text>
                </Pressable>

                <Pressable style={styles.stopMeditationButton} onPress={stopMeditation}>
                  <Ionicons name="stop" size={20} color={colors.error} />
                  <Text variant="caption" style={{ color: colors.error }}>
                    Stop
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : isTracking ? (
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

              <Text variant="caption" color="muted" align="center" style={styles.hint}>
                {currentStage === 'rem'
                  ? 'REM detected - dream audio playing'
                  : 'Waiting for REM sleep to play dreams...'}
              </Text>

              <SleepStageGraph
                stages={stageHistory}
                currentStage={currentStage}
                isTracking={isTracking}
                isDarkMode={isDarkOverlayVisible}
                sessionStartTime={
                  session?.startTime ? new Date(session.startTime).getTime() : undefined
                }
              />

              <View style={styles.actionRow}>
                <Pressable style={styles.darkModeButton} onPress={showDarkOverlay}>
                  <Ionicons name="moon" size={20} color={colors.gray[400]} />
                  <Text variant="caption" color="muted">
                    Dark Screen
                  </Text>
                </Pressable>

                <Pressable style={styles.stopTrackingButton} onPress={handleStopTracking}>
                  <Ionicons name="stop" size={20} color={colors.error} />
                  <Text variant="caption" style={{ color: colors.error }}>
                    Stop
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.trackingInactive}>
              <Ionicons name="bed" size={80} color={colors.primary[500]} />
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
                  <Ionicons name="play-outline" size={20} color={colors.primary[400]} />
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

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setHelpMeFallAsleep(!helpMeFallAsleep)}
              >
                <View style={[styles.checkbox, helpMeFallAsleep && styles.checkboxChecked]}>
                  {helpMeFallAsleep && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </View>
                <Text variant="body" color="secondary">
                  Help me fall asleep
                </Text>
                <View style={styles.meditationBadge}>
                  <Ionicons name="sparkles" size={12} color={colors.primary[400]} />
                  <Text variant="caption" color="primary">
                    ~30 min meditation
                  </Text>
                </View>
              </Pressable>

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

              {history.length > 0 && (
                <View style={styles.historySection}>
                  <Text
                    variant="body"
                    weight="semibold"
                    color="primary"
                    style={styles.historyTitle}
                  >
                    Sleep History
                  </Text>
                  {history.slice(0, 5).map((pastSession) => (
                    <SleepHistoryCard
                      key={pastSession.id}
                      session={pastSession}
                      onPress={() => setSelectedSession(pastSession)}
                      onDelete={() => handleDeleteSession(pastSession.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <SleepSessionDetailModal
        session={selectedSession}
        visible={selectedSession !== null}
        onClose={() => setSelectedSession(null)}
      />

      <Modal
        visible={showSleepSummary}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSleepSummary(false)}
      >
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryModal}>
            <Ionicons name="bed" size={48} color={colors.primary[400]} />
            <Heading variant="h3" color="primary" style={styles.summaryTitle}>
              Sleep Complete
            </Heading>
            {sleepSummaryData && (
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text variant="caption" color="muted">
                    Total Sleep
                  </Text>
                  <Text variant="h4" weight="bold" color="primary">
                    {Math.floor(sleepSummaryData.total / 60)}h {sleepSummaryData.total % 60}m
                  </Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text variant="caption" color="muted">
                    REM Sleep
                  </Text>
                  <Text variant="h4" weight="bold" style={{ color: colors.success }}>
                    {sleepSummaryData.rem}m ({sleepSummaryData.remPct}%)
                  </Text>
                </View>
              </View>
            )}
            <Button
              variant="primary"
              onPress={() => setShowSleepSummary(false)}
              style={styles.summaryButton}
            >
              Done
            </Button>
          </View>
        </View>
      </Modal>

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
              setShowMicTest(true);
            }}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showMicTest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMicTest(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowMicTest(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[400]} />
            </Pressable>
          </View>
          <MicrophoneTest onComplete={handleMicTestComplete} onSkip={handleMicTestSkip} />
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
  meditationContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  meditationDesc: {
    maxWidth: 280,
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
  hint: {
    maxWidth: 280,
    alignSelf: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  darkModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.lg,
  },
  stopTrackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
  },
  skipMeditationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.lg,
  },
  meditationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  meditationControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  meditationPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary[400],
  },
  stopMeditationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.gray[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  meditationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.full,
  },
  startButton: {
    minWidth: 200,
  },
  browseLink: {
    marginTop: spacing.md,
  },
  historySection: {
    width: '100%',
    marginTop: spacing.xl,
  },
  historyTitle: {
    marginBottom: spacing.md,
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
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  summaryModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 320,
  },
  summaryTitle: {
    marginTop: spacing.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginVertical: spacing.md,
  },
  summaryStat: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryButton: {
    marginTop: spacing.md,
    minWidth: 120,
  },
});
