import { useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { WearableStatus } from '@/components/WearableStatus';
import { LaunchQueueCard } from '@/components/LaunchQueueCard';
import { useAuth } from '@/hooks/useAuth';
import { useSleepTracking } from '@/hooks/useSleepTracking';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';
import { useWearable } from '@/hooks/useWearable';
import { getSleepStageDisplayName, getSleepStageColor } from '@/services/sleep';
import { colors, spacing, borderRadius } from '@/theme/tokens';

export default function SleepScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { connectedDevice } = useWearable();
  const { session, currentStage, isTracking, start, stop } = useSleepTracking();
  const { queue, activeItem, setReady, launch, remove, isLoading } = useLaunchQueue();

  const handleStartTracking = useCallback(async () => {
    try {
      await start(connectedDevice ? 'wearable' : 'manual');
    } catch {
      Alert.alert('Error', 'Failed to start sleep tracking');
    }
  }, [start, connectedDevice]);

  const handleStopTracking = useCallback(async () => {
    Alert.alert(
      'Stop Sleep Tracking',
      'Are you sure you want to stop tracking your sleep?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              const summary = await stop();
              if (summary) {
                Alert.alert(
                  'Sleep Summary',
                  `Total: ${summary.totalDurationMinutes} mins\nREM: ${summary.remMinutes} mins (${summary.remPercentage}%)`
                );
              }
            } catch {
              Alert.alert('Error', 'Failed to stop sleep tracking');
            }
          },
        },
      ]
    );
  }, [stop]);

  const handleSetReady = useCallback(async (queueId: string) => {
    try {
      await setReady(queueId);
    } catch {
      Alert.alert('Error', 'Failed to update queue item');
    }
  }, [setReady]);

  const handleLaunch = useCallback(async (queueId: string) => {
    try {
      await launch(queueId);
      router.push('/dream/launch');
    } catch {
      Alert.alert('Error', 'Failed to launch dream');
    }
  }, [launch, router]);

  const handleRemove = useCallback(async (queueId: string) => {
    try {
      await remove(queueId);
    } catch {
      Alert.alert('Error', 'Failed to remove from queue');
    }
  }, [remove]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text variant="h2" weight="bold" color="primary">
            Sleep Mode
          </Text>
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="moon-outline" size={64} color={colors.gray[500]} />
          <Text variant="h4" color="primary" align="center" style={styles.guestTitle}>
            Sign in to use Sleep Mode
          </Text>
          <Text variant="body" color="secondary" align="center">
            Track your sleep and launch dreams at the perfect moment
          </Text>
          <Button
            variant="primary"
            style={styles.authButton}
            onPress={() => router.push('/auth/login')}
          >
            Sign In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="h2" weight="bold" color="primary">
            Sleep Mode
          </Text>
        </View>

        <View style={styles.statusSection}>
          <WearableStatus onPressConnect={() => Alert.alert('Coming Soon', 'Device pairing will be available soon.')} />
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
                  <View style={[styles.stageBadge, { backgroundColor: `${getSleepStageColor(currentStage)}20` }]}>
                    <View style={[styles.stageDot, { backgroundColor: getSleepStageColor(currentStage) }]} />
                    <Text variant="body" weight="semibold" style={{ color: getSleepStageColor(currentStage) }}>
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
            <Text variant="bodySmall" color="secondary" weight="medium">
              DREAM QUEUE
            </Text>
            <Pressable onPress={() => router.push('/(tabs)')}>
              <Text variant="bodySmall" color="primary">
                Browse Dreams
              </Text>
            </Pressable>
          </View>

          {queue.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Ionicons name="list-outline" size={40} color={colors.gray[600]} />
              <Text variant="body" color="secondary" align="center">
                No dreams queued
              </Text>
              <Text variant="caption" color="muted" align="center">
                Add dreams from the detail screen to queue them for launch
              </Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {queue.map((item) => (
                <LaunchQueueCard
                  key={item.id}
                  item={item}
                  isActive={activeItem?.id === item.id}
                  onSetReady={() => handleSetReady(item.id)}
                  onLaunch={() => handleLaunch(item.id)}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
});
