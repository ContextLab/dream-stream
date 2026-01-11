import { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { DraggableQueueList } from '@/components/DraggableQueueList';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { RepeatMode } from '@/types/database';

function formatQueueDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function QueueScreen() {
  const router = useRouter();
  const { queue, activeItem, remove, reorderByIndex, clear, shuffle, repeatMode, setRepeatMode } =
    useLaunchQueue();

  const handlePlay = useCallback(
    (dreamId: string) => {
      router.push(`/dream/${dreamId}`);
    },
    [router]
  );

  const handleRemove = useCallback(
    async (queueId: string) => {
      try {
        await remove(queueId);
      } catch {
        Alert.alert('Error', 'Failed to remove from queue');
      }
    },
    [remove]
  );

  const handleDragEnd = useCallback(
    async (fromIndex: number, toIndex: number) => {
      try {
        await reorderByIndex(fromIndex, toIndex);
      } catch {
        Alert.alert('Error', 'Failed to reorder queue');
      }
    },
    [reorderByIndex]
  );

  const handleClear = useCallback(async () => {
    Alert.alert('Clear Queue', 'Remove all dreams from the queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await clear();
          } catch {
            Alert.alert('Error', 'Failed to clear queue');
          }
        },
      },
    ]);
  }, [clear]);

  const handleShuffle = useCallback(async () => {
    try {
      await shuffle();
    } catch {
      Alert.alert('Error', 'Failed to shuffle queue');
    }
  }, [shuffle]);

  const handleToggleRepeat = useCallback(async () => {
    const nextMode = repeatMode === 'off' ? 'all' : 'off';
    try {
      await setRepeatMode(nextMode);
    } catch {
      Alert.alert('Error', 'Failed to change repeat mode');
    }
  }, [repeatMode, setRepeatMode]);

  const totalDuration = queue.reduce((acc, item) => acc + item.dream.full_duration_seconds, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Heading variant="h2" color="primary">
              Queue
            </Heading>
            {queue.length > 0 && (
              <Text variant="caption" color="muted">
                {queue.length} {queue.length === 1 ? 'dream' : 'dreams'} (
                {formatQueueDuration(totalDuration)})
              </Text>
            )}
          </View>
        </View>

        {queue.length > 0 && (
          <View style={styles.controlsSection}>
            <View style={styles.controlsRow}>
              <Pressable style={styles.controlButton} onPress={handleShuffle}>
                <Ionicons name="shuffle-outline" size={20} color={colors.gray[300]} />
                <Text variant="caption" color="secondary">
                  Shuffle
                </Text>
              </Pressable>

              <Pressable style={styles.controlButton} onPress={handleToggleRepeat}>
                <Ionicons
                  name={repeatMode === 'off' ? 'repeat-outline' : 'repeat'}
                  size={20}
                  color={repeatMode === 'off' ? colors.gray[400] : colors.primary[400]}
                />
                <Text variant="caption" color={repeatMode === 'off' ? 'secondary' : 'primary'}>
                  {repeatMode === 'off' ? 'Repeat Off' : 'Repeat All'}
                </Text>
              </Pressable>

              <Pressable style={styles.controlButton} onPress={handleClear}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
                <Text variant="caption" style={{ color: colors.error }}>
                  Clear
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.queueSection}>
          {queue.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={64} color={colors.gray[600]} />
              <Text variant="h4" color="secondary" align="center" style={styles.emptyTitle}>
                Your queue is empty
              </Text>
              <Text variant="body" color="muted" align="center" style={styles.emptyMessage}>
                Tap the moon icon on any dream to add it to your queue
              </Text>
              <Button variant="primary" onPress={() => router.push('/(tabs)')}>
                Browse Dreams
              </Button>
            </View>
          ) : (
            <View style={styles.queueList}>
              <Button
                variant="primary"
                onPress={() => router.push('/(tabs)/dream')}
                leftIcon={<Ionicons name="play" size={20} color="#ffffff" />}
                style={styles.playQueueButton}
              >
                Start Dream Mode
              </Button>
              <Text variant="caption" color="muted" style={styles.dragHint}>
                Drag to reorder
              </Text>
              <DraggableQueueList
                items={queue}
                activeItemId={activeItem?.id}
                onReorder={handleDragEnd}
                onRemove={handleRemove}
                onPlay={handlePlay}
              />
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  controlsSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
  },
  controlButton: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    minWidth: 80,
  },
  queueSection: {
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.md,
  },
  emptyMessage: {
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  queueList: {
    gap: spacing.md,
  },
  playQueueButton: {
    marginBottom: spacing.md,
  },
  dragHint: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
