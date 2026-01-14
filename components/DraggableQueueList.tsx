import { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { type QueuedDream } from '@/services/launchQueue';
import { getSleepStageDisplayName } from '@/services/sleep';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  touchTargetMinSize,
  fontFamily,
} from '@/theme/tokens';

const CARD_HEIGHT = 100;
const CARD_GAP = 16;
const ITEM_HEIGHT = CARD_HEIGHT + CARD_GAP;

interface DraggableQueueListProps {
  items: QueuedDream[];
  activeItemId?: string;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  onPlay: (id: string) => void;
}

interface DraggableCardProps {
  item: QueuedDream;
  index: number;
  totalCount: number;
  isActive: boolean;
  draggedIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  onRemove: () => void;
  onPlay: () => void;
  onDragStart: (index: number) => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function DraggableCard({
  item,
  index,
  totalCount,
  isActive,
  draggedIndex,
  dragY,
  onRemove,
  onPlay,
  onDragStart,
  onDragEnd,
}: DraggableCardProps) {
  const targetStage = item.target_sleep_stage
    ? getSleepStageDisplayName(item.target_sleep_stage)
    : 'Any stage';

  const canDrag = totalCount > 1;

  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const contextY = useSharedValue(0);

  const handleDragEnd = (fromIdx: number, toIdx: number) => {
    onDragEnd(fromIdx, toIdx);
  };

  const panGesture = Gesture.Pan()
    .enabled(canDrag)
    .onStart(() => {
      isDragging.value = true;
      contextY.value = translateY.value;
      draggedIndex.value = index;
      runOnJS(onDragStart)(index);
    })
    .onUpdate((event) => {
      translateY.value = contextY.value + event.translationY;
      dragY.value = event.translationY;
    })
    .onEnd(() => {
      const movedPositions = Math.round(translateY.value / ITEM_HEIGHT);
      const newIndex = Math.max(0, Math.min(totalCount - 1, index + movedPositions));

      if (newIndex !== index) {
        runOnJS(handleDragEnd)(index, newIndex);
      }

      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      isDragging.value = false;
      draggedIndex.value = -1;
      dragY.value = 0;
    });

  const animatedDragStyle = useAnimatedStyle(() => {
    if (isDragging.value) {
      return {
        transform: [{ translateY: translateY.value }, { scale: 1.02 }],
        zIndex: 100,
        shadowOpacity: 0.4,
      };
    }

    const currentDraggedIndex = draggedIndex.value;
    if (currentDraggedIndex === -1 || currentDraggedIndex === index) {
      return {
        transform: [{ translateY: 0 }],
        zIndex: 0,
      };
    }

    const dragOffset = dragY.value;
    const draggedNewPosition = currentDraggedIndex + Math.round(dragOffset / ITEM_HEIGHT);
    const clampedNewPosition = Math.max(0, Math.min(totalCount - 1, draggedNewPosition));

    let offset = 0;
    if (currentDraggedIndex < index && clampedNewPosition >= index) {
      offset = -ITEM_HEIGHT;
    } else if (currentDraggedIndex > index && clampedNewPosition <= index) {
      offset = ITEM_HEIGHT;
    }

    return {
      transform: [{ translateY: withSpring(offset, { damping: 20, stiffness: 200 }) }],
      zIndex: 0,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, isActive && styles.cardActive, animatedDragStyle]}>
        {totalCount > 1 && (
          <View style={styles.dragHandle}>
            <Ionicons name="menu" size={20} color={canDrag ? colors.gray[500] : colors.gray[700]} />
          </View>
        )}

        <View style={styles.iconContainer}>
          <Ionicons name="radio-outline" size={24} color={colors.primary[500]} />
          <Text variant="caption" color="muted" style={styles.durationText}>
            {formatDuration(item.dream.full_duration_seconds)}
          </Text>
        </View>

        <View style={styles.content}>
          <MarqueeText
            variant="body"
            weight="semibold"
            style={styles.title}
            speed={25}
            pauseDuration={2000}
          >
            {item.dream.title}
          </MarqueeText>

          <View style={styles.metaRow}>
            <View style={styles.triggerInfo}>
              <Ionicons name="moon-outline" size={12} color={colors.gray[400]} />
              <Text variant="caption" color="secondary" style={styles.triggerText}>
                {targetStage}
              </Text>
            </View>

            <Pressable style={styles.playButton} onPress={onPlay}>
              <Ionicons name="play" size={14} color={colors.primary[400]} />
              <Text variant="caption" style={{ color: colors.primary[400] }}>
                Preview
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={8}
          accessibilityLabel="Remove from queue"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={20} color={colors.gray[400]} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function DraggableQueueList({
  items,
  activeItemId,
  onReorder,
  onRemove,
  onPlay,
}: DraggableQueueListProps) {
  const draggedIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const [, setDragging] = useState(false);

  const handleDragStart = useCallback(() => {
    setDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (fromIndex: number, toIndex: number) => {
      setDragging(false);
      if (fromIndex !== toIndex) {
        onReorder(fromIndex, toIndex);
      }
    },
    [onReorder]
  );

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <DraggableCard
          key={item.id}
          item={item}
          index={index}
          totalCount={items.length}
          isActive={activeItemId === item.id}
          draggedIndex={draggedIndex}
          dragY={dragY}
          onRemove={() => onRemove(item.id)}
          onPlay={() => onPlay(item.dream_id)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: CARD_GAP,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    padding: spacing.sm,
    height: CARD_HEIGHT,
    ...shadows.md,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  dragHandle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginRight: spacing.xs,
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
    fontFamily: fontFamily.regular,
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
    gap: spacing.md,
  },
  triggerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  triggerText: {
    marginLeft: 2,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  removeButton: {
    minWidth: touchTargetMinSize,
    minHeight: touchTargetMinSize,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
});
