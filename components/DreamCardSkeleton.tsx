import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '@/theme/tokens';

interface DreamCardSkeletonProps {
  variant?: 'default' | 'compact' | 'featured';
}

export function DreamCardSkeleton({ variant = 'default' }: DreamCardSkeletonProps) {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 0 }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [shimmerPosition]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + (shimmerPosition.value + 1) * 0.2,
  }));

  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  return (
    <View
      style={[
        styles.container,
        isFeatured && styles.featuredContainer,
        isCompact && styles.compactContainer,
      ]}
    >
      <Animated.View
        style={[
          styles.imagePlaceholder,
          isFeatured && styles.featuredImagePlaceholder,
          isCompact && styles.compactImagePlaceholder,
          shimmerStyle,
        ]}
      />
      <View style={[styles.content, isCompact && styles.compactContent]}>
        <Animated.View
          style={[
            styles.titlePlaceholder,
            isFeatured && styles.featuredTitlePlaceholder,
            shimmerStyle,
          ]}
        />
        <Animated.View style={[styles.categoryPlaceholder, shimmerStyle]} />
      </View>
    </View>
  );
}

export function DreamCardSkeletonList({
  count = 3,
  variant = 'default',
}: {
  count?: number;
  variant?: 'default' | 'compact' | 'featured';
}) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <DreamCardSkeleton variant={variant} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    overflow: 'hidden',
  },
  featuredContainer: {
    width: 280,
    marginRight: spacing.md,
  },
  compactContainer: {
    flexDirection: 'row',
    height: 100,
  },
  imagePlaceholder: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.gray[800],
  },
  featuredImagePlaceholder: {
    aspectRatio: 4 / 3,
  },
  compactImagePlaceholder: {
    width: 120,
    aspectRatio: undefined,
    height: '100%',
  },
  content: {
    padding: spacing.sm,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titlePlaceholder: {
    height: 16,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.sm,
    width: '75%',
    marginBottom: spacing.xs,
  },
  featuredTitlePlaceholder: {
    height: 20,
    width: '85%',
  },
  categoryPlaceholder: {
    height: 12,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.sm,
    width: '35%',
  },
  listContainer: {
    padding: spacing.md,
  },
  listItem: {
    marginBottom: spacing.md,
  },
});
