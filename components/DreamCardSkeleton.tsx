import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { spacing, borderRadius, shadows } from '@/theme/tokens';

interface DreamCardSkeletonProps {
  variant?: 'default' | 'compact' | 'featured';
}

export function DreamCardSkeleton({ variant = 'default' }: DreamCardSkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

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
          { opacity },
        ]}
      />
      <View style={[styles.content, isCompact && styles.compactContent]}>
        <Animated.View
          style={[
            styles.titlePlaceholder,
            isFeatured && styles.featuredTitlePlaceholder,
            { opacity },
          ]}
        />
        <Animated.View style={[styles.categoryPlaceholder, { opacity }]} />
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
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
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
    backgroundColor: '#252542',
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
    height: 20,
    backgroundColor: '#252542',
    borderRadius: borderRadius.sm,
    width: '80%',
    marginBottom: spacing.xs,
  },
  featuredTitlePlaceholder: {
    height: 24,
    width: '90%',
  },
  categoryPlaceholder: {
    height: 14,
    backgroundColor: '#252542',
    borderRadius: borderRadius.sm,
    width: '40%',
  },
  listContainer: {
    padding: spacing.md,
  },
  listItem: {
    marginBottom: spacing.md,
  },
});
