import { memo, useMemo } from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { colors, touchTargetMinSize, borderRadius } from '@/theme/tokens';
import type { DreamListItem } from '@/types/database';

interface DreamCardProps {
  dream: DreamListItem;
  variant?: 'default' | 'compact' | 'featured';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
}

export const DreamCard = memo(function DreamCard({ dream, variant = 'default' }: DreamCardProps) {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const containerStyle = useMemo(() => ({
    ...styles.container,
    ...(isFeatured ? styles.featuredContainer : {}),
    ...(isCompact ? styles.compactContainer : {}),
  }), [isFeatured, isCompact]);

  return (
    <Link href={`/dream/${dream.id}`} asChild>
      <Pressable style={containerStyle}

      >
        <View style={[styles.imageContainer, isFeatured && styles.featuredImageContainer]}>
          <Image
            source={{ uri: dream.artwork_url }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.durationBadge}>
            <Text variant="caption" color="inherit" style={styles.durationText}>
              {formatDuration(dream.full_duration_seconds)}
            </Text>
          </View>
          {dream.is_featured && !isFeatured && (
            <View style={styles.featuredBadge}>
              <Text variant="caption" color="inherit" style={styles.featuredText}>
                Featured
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.content, isCompact && styles.compactContent]}>
          <Text
            variant={isFeatured ? 'h4' : 'body'}
            weight="semibold"
            numberOfLines={isFeatured ? 2 : 1}
            style={styles.title}
          >
            {dream.title}
          </Text>
          {dream.category && (
            <View style={styles.categoryContainer}>
              {dream.category.color && (
                <View style={[styles.categoryDot, { backgroundColor: dream.category.color }]} />
              )}
              <Text variant="caption" color="secondary">
                {dream.category.name}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    overflow: 'hidden',
    minHeight: touchTargetMinSize,
  },
  featuredContainer: {
    width: 280,
    marginRight: 16,
    borderColor: colors.primary[900],
  },
  compactContainer: {
    flexDirection: 'row',
    height: 100,
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: colors.gray[950],
  },
  featuredImageContainer: {
    aspectRatio: 4 / 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    color: colors.gray[300],
    fontSize: 11,
    fontFamily: 'monospace',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  featuredText: {
    color: colors.gray[950],
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 12,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.gray[100],
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
