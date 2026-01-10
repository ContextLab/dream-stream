import { useCallback, useState, useEffect } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useLaunchQueue, useQueueStatus } from '@/hooks/useLaunchQueue';
import { colors, touchTargetMinSize } from '@/theme/tokens';

interface QueueButtonProps {
  dreamId: string;
  size?: number;
  showBackground?: boolean;
}

export function QueueButton({ dreamId, size = 24, showBackground = false }: QueueButtonProps) {
  const { add, remove, queue } = useLaunchQueue();
  const { inQueue, isLoading: statusLoading } = useQueueStatus(dreamId);
  const [isUpdating, setIsUpdating] = useState(false);
  const scale = useSharedValue(1);

  const queueItem = queue.find((item) => item.dream_id === dreamId);

  const handlePress = useCallback(async () => {
    scale.value = withSpring(1.3, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });

    setIsUpdating(true);
    try {
      if (inQueue && queueItem) {
        await remove(queueItem.id);
      } else {
        await add(dreamId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update queue';
      Alert.alert('Error', message);
    } finally {
      setIsUpdating(false);
    }
  }, [inQueue, queueItem, add, remove, dreamId, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isLoading = statusLoading || isUpdating;

  if (isLoading) {
    return (
      <Pressable style={[styles.button, showBackground && styles.buttonWithBackground]} disabled>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.button, showBackground && styles.buttonWithBackground]}
      onPress={handlePress}
      hitSlop={8}
      accessibilityLabel={inQueue ? 'Remove from queue' : 'Add to queue'}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={inQueue ? 'moon' : 'moon-outline'}
          size={size}
          color={inQueue ? colors.primary[400] : colors.gray[400]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: touchTargetMinSize,
    minHeight: touchTargetMinSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWithBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: touchTargetMinSize / 2,
  },
});
