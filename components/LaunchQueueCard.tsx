import { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { getStatusDisplayName, getStatusColor } from '@/services/launchQueue';
import { getSleepStageDisplayName } from '@/services/sleep';
import { colors, spacing, borderRadius, shadows, touchTargetMinSize } from '@/theme/tokens';
import type { QueuedDream } from '@/services/launchQueue';

const CARD_HEIGHT = 100;

interface LaunchQueueCardProps {
  item: QueuedDream;
  index?: number;
  totalCount?: number;
  onRemove?: () => void;
  onSetReady?: () => void;
  onLaunch?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  isActive?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const LaunchQueueCard = memo(function LaunchQueueCard({
  item,
  index = 0,
  totalCount = 1,
  onRemove,
  onSetReady,
  onLaunch,
  onMoveUp,
  onMoveDown,
  onDragEnd,
  isActive = false,
}: LaunchQueueCardProps) {
  const statusColor = getStatusColor(item.status);
  const statusName = getStatusDisplayName(item.status);
  const targetStage = item.target_sleep_stage
    ? getSleepStageDisplayName(item.target_sleep_stage)
    : 'Any stage';

  const canMoveUp = index > 0 && item.status === 'pending';
  const canMoveDown = index < totalCount - 1 && item.status === 'pending';
  const canDrag = item.status === 'pending' && totalCount > 1;

  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const zIndex = useSharedValue(0);

  const handleDragEnd = (fromIdx: number, toIdx: number) => {
    if (onDragEnd && fromIdx !== toIdx) {
      onDragEnd(fromIdx, toIdx);
    }
  };

  const panGesture = Gesture.Pan()
    .enabled(canDrag)
    .onStart(() => {
      isDragging.value = true;
      zIndex.value = 100;
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      const movedPositions = Math.round(translateY.value / CARD_HEIGHT);
      const newIndex = Math.max(0, Math.min(totalCount - 1, index + movedPositions));

      if (newIndex !== index) {
        runOnJS(handleDragEnd)(index, newIndex);
      }

      translateY.value = withSpring(0);
      isDragging.value = false;
      zIndex.value = 0;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: zIndex.value,
    opacity: isDragging.value ? 0.9 : 1,
    shadowOpacity: isDragging.value ? 0.3 : 0.1,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, isActive && styles.containerActive, animatedStyle]}>
        {totalCount > 1 && (
          <View style={styles.reorderControls}>
            <Pressable
              style={[styles.reorderButton, !canMoveUp && styles.reorderButtonDisabled]}
              onPress={canMoveUp ? onMoveUp : undefined}
              disabled={!canMoveUp}
            >
              <Ionicons
                name="chevron-up"
                size={16}
                color={canMoveUp ? colors.gray[300] : colors.gray[700]}
              />
            </Pressable>
            <Text variant="caption" color="muted" style={styles.orderNumber}>
              {index + 1}
            </Text>
            <Pressable
              style={[styles.reorderButton, !canMoveDown && styles.reorderButtonDisabled]}
              onPress={canMoveDown ? onMoveDown : undefined}
              disabled={!canMoveDown}
            >
              <Ionicons
                name="chevron-down"
                size={16}
                color={canMoveDown ? colors.gray[300] : colors.gray[700]}
              />
            </Pressable>
          </View>
        )}
        <View style={styles.iconContainer}>
          <Ionicons name="radio-outline" size={24} color={colors.primary[500]} />
          <Text variant="caption" color="muted" style={styles.durationText}>
            {formatDuration(item.dream.full_duration_seconds)}
          </Text>
        </View>

        <View style={styles.content}>
          <Text variant="body" weight="semibold" numberOfLines={1} style={styles.title}>
            {item.dream.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text variant="caption" style={{ color: statusColor }}>
                {statusName}
              </Text>
            </View>

            <View style={styles.triggerInfo}>
              <Ionicons name="bed-outline" size={12} color={colors.gray[400]} />
              <Text variant="caption" color="secondary" style={styles.triggerText}>
                {targetStage}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            {item.status === 'pending' && onSetReady && (
              <Pressable style={styles.actionButton} onPress={onSetReady}>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                <Text variant="caption" style={{ color: colors.success }}>
                  Ready
                </Text>
              </Pressable>
            )}

            {item.status === 'ready' && onLaunch && (
              <Pressable style={[styles.actionButton, styles.launchButton]} onPress={onLaunch}>
                <Ionicons name="play" size={16} color="#ffffff" />
                <Text variant="caption" style={styles.launchText}>
                  Launch Now
                </Text>
              </Pressable>
            )}

            {onRemove && item.status !== 'launched' && (
              <Pressable style={styles.removeButton} onPress={onRemove} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.gray[400]} />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    padding: spacing.sm,
    ...shadows.md,
  },
  containerActive: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  iconContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  durationText: {
    marginTop: 4,
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 10,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  triggerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  triggerText: {
    marginLeft: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  launchButton: {
    backgroundColor: colors.primary[500],
  },
  launchText: {
    color: '#ffffff',
  },
  removeButton: {
    marginLeft: 'auto',
    minWidth: touchTargetMinSize,
    minHeight: touchTargetMinSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderControls: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginRight: spacing.xs,
  },
  reorderButton: {
    padding: 4,
  },
  reorderButtonDisabled: {
    opacity: 0.3,
  },
  orderNumber: {
    fontFamily: 'CourierPrime_400Regular',
    fontSize: 11,
  },
});
