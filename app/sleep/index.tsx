import { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useThemedAlert } from '@/components/ui/ThemedAlert';
import { WearableStatus } from '@/components/WearableStatus';
import { LaunchQueueCard } from '@/components/LaunchQueueCard';
import { VolumeSetup } from '@/components/VolumeSetup';
import { MusicSettings } from '@/components/MusicSettings';
import { useSleepTracking } from '@/hooks/useSleepTracking';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';
import { useWearable } from '@/hooks/useWearable';
import {
  getSleepStageDisplayName,
  getSleepStageColor,
  onRemStart,
  onRemEnd,
} from '@/services/sleep';
import { colors, spacing, borderRadius, fontFamily } from '@/theme/tokens';
import type { RepeatMode } from '@/types/database';

function formatQueueDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function SleepScreen() {
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const { connectedDevice } = useWearable();
  const { currentStage, isTracking, start, stop } = useSleepTracking();
  const {
    queue,
    activeItem,
    setReady,
    launch,
    remove,
    moveUp,
    moveDown,
    clear,
    toggleShuffle,
    shuffleEnabled,
    repeatMode,
    setRepeatMode,
  } = useLaunchQueue();
  const [showVolumeSetup, setShowVolumeSetup] = useState(false);
  const [setupTab, setSetupTab] = useState<'volume' | 'music'>('volume');
  const remUnsubscribeRef = useRef<(() => void) | null>(null);
  const remEndUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isTracking && queue.length > 0) {
      remUnsubscribeRef.current = onRemStart(() => {
        console.log('[Sleep] REM detected - launching dream');
        const firstReady = queue.find((item) => item.status === 'ready');
        const firstPending = queue.find((item) => item.status === 'pending');
        const itemToLaunch = firstReady || firstPending;

        if (itemToLaunch) {
          handleLaunch(itemToLaunch.id);
        }
      });

      remEndUnsubscribeRef.current = onRemEnd(() => {
        console.log('[Sleep] REM ended');
      });
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

  const handleVolumeComplete = useCallback(async () => {
    setShowVolumeSetup(false);
    try {
      await start('audio');
    } catch {
      showAlert(
        'Error',
        'Failed to start sleep tracking. Please ensure microphone access is enabled.'
      );
    }
  }, [start]);

  const handleStartTracking = useCallback(() => {
    setSetupTab('volume');
    setShowVolumeSetup(true);
  }, []);

  const handleStopTracking = useCallback(async () => {
    showAlert('Stop Sleep Tracking', 'Are you sure you want to stop tracking your sleep?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            const summary = await stop();
            if (summary) {
              showAlert(
                'Sleep Summary',
                `Total: ${summary.totalDurationMinutes} mins\nREM: ${summary.remMinutes} mins (${summary.remPercentage}%)`
              );
            }
          } catch {
            showAlert('Error', 'Failed to stop sleep tracking');
          }
        },
      },
    ]);
  }, [stop]);

  const handleSetReady = useCallback(
    async (queueId: string) => {
      try {
        await setReady(queueId);
      } catch {
        showAlert('Error', 'Failed to update queue item');
      }
    },
    [setReady]
  );

  const handleLaunch = useCallback(
    async (queueId: string) => {
      try {
        await launch(queueId);
        router.push('/dream/launch');
      } catch {
        showAlert('Error', 'Failed to launch dream');
      }
    },
    [launch, router]
  );

  const handleRemove = useCallback(
    async (queueId: string) => {
      try {
        await remove(queueId);
      } catch {
        showAlert('Error', 'Failed to remove from queue');
      }
    },
    [remove]
  );

  const handleMoveUp = useCallback(
    async (queueId: string) => {
      try {
        await moveUp(queueId);
      } catch {
        showAlert('Error', 'Failed to reorder queue');
      }
    },
    [moveUp]
  );

  const handleMoveDown = useCallback(
    async (queueId: string) => {
      try {
        await moveDown(queueId);
      } catch {
        showAlert('Error', 'Failed to reorder queue');
      }
    },
    [moveDown]
  );

  const handleClear = useCallback(async () => {
    showAlert('Clear Queue', 'Remove all dreams from the queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await clear();
          } catch {
            showAlert('Error', 'Failed to clear queue');
          }
        },
      },
    ]);
  }, [clear]);

  const handleToggleShuffle = useCallback(async () => {
    try {
      await toggleShuffle();
    } catch {
      showAlert('Error', 'Failed to toggle shuffle mode');
    }
  }, [toggleShuffle]);

  const handleToggleRepeat = useCallback(async () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    try {
      await setRepeatMode(nextMode);
    } catch {
      showAlert('Error', 'Failed to change repeat mode');
    }
  }, [repeatMode, setRepeatMode]);

  const getRepeatIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (repeatMode) {
      case 'one':
        return 'repeat';
      case 'all':
        return 'repeat';
      default:
        return 'repeat-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h2" weight="bold" color="primary">
            Sleep Mode
          </Text>
        </View>

        <View style={styles.statusSection}>
          <WearableStatus
            onPressConnect={() =>
              showAlert('Coming Soon', 'Device pairing will be available soon.')
            }
          />
        </View>

        <View style={styles.trackingSection}>
          <View style={styles.sectionHeader}>
            <Text variant="bodySmall" color="secondary" weight="medium">
              SLEEP TRACKING
            </Text>
          </View>

          {isTracking ? (
            <View style={styles.activeTracking}>
              <View style={styles.trackingStatus}>
                <View style={styles.pulsingDot} />
                <Text variant="body" weight="medium" color="primary">
                  Tracking Sleep
                </Text>
              </View>

              {currentStage && (
                <View style={styles.stageInfo}>
                  <Text variant="caption" color="secondary">
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
                      variant="body"
                      weight="semibold"
                      style={{ color: getSleepStageColor(currentStage) }}
                    >
                      {getSleepStageDisplayName(currentStage)}
                    </Text>
                  </View>
                </View>
              )}

              <Button variant="outline" onPress={handleStopTracking} style={styles.stopButton}>
                Stop Tracking
              </Button>
            </View>
          ) : (
            <View style={styles.inactiveTracking}>
              <Ionicons name="moon-outline" size={48} color={colors.gray[500]} />
              <Text variant="body" color="secondary" align="center" style={styles.trackingMessage}>
                Start tracking to monitor your sleep and launch dreams at the optimal time
              </Text>
              <Button variant="primary" onPress={handleStartTracking}>
                Start Sleep Tracking
              </Button>
            </View>
          )}
        </View>

        <View style={styles.queueSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.queueHeaderLeft}>
              <Text variant="bodySmall" color="secondary" weight="medium">
                DREAM QUEUE
              </Text>
              {queue.length > 0 && (
                <Text variant="caption" color="muted" style={styles.queueDuration}>
                  {formatQueueDuration(
                    queue.reduce((acc, item) => acc + item.dream.full_duration_seconds, 0)
                  )}
                </Text>
              )}
            </View>
            <Pressable onPress={() => router.push('/(tabs)')}>
              <Text variant="bodySmall" color="primary">
                Browse Dreams
              </Text>
            </Pressable>
          </View>

          {queue.length > 0 && (
            <View style={styles.queueControls}>
              <Pressable style={styles.queueControlButton} onPress={handleToggleShuffle}>
                <Ionicons
                  name={shuffleEnabled ? 'shuffle' : 'shuffle-outline'}
                  size={20}
                  color={shuffleEnabled ? '#22c55e' : colors.gray[400]}
                />
              </Pressable>
              <Pressable style={styles.queueControlButton} onPress={handleToggleRepeat}>
                <Ionicons
                  name={getRepeatIcon()}
                  size={20}
                  color={repeatMode === 'off' ? colors.gray[400] : colors.primary[400]}
                />
                {repeatMode === 'one' && (
                  <Text variant="caption" color="primary" style={styles.repeatOneLabel}>
                    1
                  </Text>
                )}
              </Pressable>
              <Pressable style={styles.queueControlButton} onPress={handleClear}>
                <Ionicons name="trash-outline" size={20} color={colors.gray[400]} />
              </Pressable>
            </View>
          )}

          {queue.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Ionicons name="list-outline" size={40} color={colors.gray[600]} />
              <Text variant="body" color="secondary" align="center">
                No dreams queued
              </Text>
              <Text variant="caption" color="muted" align="center">
                Tap the moon icon on any dream to add it to your queue
              </Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {queue.map((item, index) => (
                <LaunchQueueCard
                  key={item.id}
                  item={item}
                  index={index}
                  totalCount={queue.length}
                  isActive={activeItem?.id === item.id}
                  onSetReady={() => handleSetReady(item.id)}
                  onLaunch={() => handleLaunch(item.id)}
                  onRemove={() => handleRemove(item.id)}
                  onMoveUp={() => handleMoveUp(item.id)}
                  onMoveDown={() => handleMoveDown(item.id)}
                />
              ))}
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
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, setupTab === 'volume' && styles.tabActive]}
                onPress={() => setSetupTab('volume')}
              >
                <Ionicons
                  name="volume-medium"
                  size={18}
                  color={setupTab === 'volume' ? colors.primary[400] : colors.gray[500]}
                />
                <Text
                  variant="bodySmall"
                  weight={setupTab === 'volume' ? 'semibold' : 'normal'}
                  color={setupTab === 'volume' ? 'primary' : 'muted'}
                >
                  Volume
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, setupTab === 'music' && styles.tabActive]}
                onPress={() => setSetupTab('music')}
              >
                <Ionicons
                  name="musical-notes"
                  size={18}
                  color={setupTab === 'music' ? colors.primary[400] : colors.gray[500]}
                />
                <Text
                  variant="bodySmall"
                  weight={setupTab === 'music' ? 'semibold' : 'normal'}
                  color={setupTab === 'music' ? 'primary' : 'muted'}
                >
                  Music
                </Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setShowVolumeSetup(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[400]} />
            </Pressable>
          </View>
          {setupTab === 'volume' ? (
            <VolumeSetup
              onComplete={handleVolumeComplete}
              onSkip={() => {
                setShowVolumeSetup(false);
                start('audio').catch(() => {
                  showAlert(
                    'Error',
                    'Failed to start sleep tracking. Please ensure microphone access is enabled.'
                  );
                });
              }}
            />
          ) : (
            <MusicSettings onComplete={() => setSetupTab('volume')} showHeader={true} />
          )}
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
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  guestTitle: {
    marginTop: spacing.md,
  },
  authButton: {
    marginTop: spacing.md,
    minWidth: 200,
  },
  statusSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  trackingSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeTracking: {
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  trackingStatus: {
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
  stageInfo: {
    gap: spacing.xs,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stopButton: {
    marginTop: spacing.sm,
  },
  inactiveTracking: {
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  trackingMessage: {
    maxWidth: 280,
  },
  queueSection: {
    paddingHorizontal: spacing.md,
  },
  emptyQueue: {
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  queueList: {
    gap: spacing.md,
  },
  queueControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  queueControlButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  repeatOneLabel: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 10,
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
  queueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  queueDuration: {
    fontFamily: fontFamily.regular,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[800],
  },
  tabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
});
