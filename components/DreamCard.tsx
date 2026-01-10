import { memo } from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { shadows, touchTargetMinSize } from '@/theme/tokens';
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

  return (
    <Link href={`/dream/${dream.id}`} asChild>
      <Pressable
        style={[
          styles.container,
          isFeatured && styles.featuredContainer,
          isCompact && styles.compactContainer,
        ]}
        className="active:opacity-90"
      >
        <View style={[styles.imageContainer, isFeatured && styles.featuredImageContainer]}>
          <Image
            source={{ uri: dream.thumbnail_url }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.durationBadge}>
            <Text variant="caption" color="inherit" style={styles.durationText}>
              {formatDuration(dream.duration_seconds)}
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
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: touchTargetMinSize,
    ...shadows.md,
  },
  featuredContainer: {
    width: 280,
    marginRight: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    height: 100,
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    position: 'relative',
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 12,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 12,
  },
  compactContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
