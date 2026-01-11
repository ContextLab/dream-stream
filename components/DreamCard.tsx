import { memo, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { FavoriteButton } from '@/components/FavoriteButton';
import { QueueButton } from '@/components/QueueButton';
import { colors, touchTargetMinSize, borderRadius, fontFamily } from '@/theme/tokens';
import type { DreamListItem } from '@/types/database';

interface DreamCardProps {
  dream: DreamListItem;
  variant?: 'default' | 'compact' | 'featured';
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `0:${secs.toString().padStart(2, '0')}`;
}

export const DreamCard = memo(function DreamCard({ dream, variant = 'default' }: DreamCardProps) {
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';

  const containerStyle = useMemo(
    () => ({
      ...styles.container,
      ...(isFeatured ? styles.featuredContainer : {}),
      ...(isCompact ? styles.compactContainer : {}),
    }),
    [isFeatured, isCompact]
  );

  return (
    <Link href={`/dream/${dream.id}`} asChild>
      <Pressable style={containerStyle}>
        <View
          style={
            isFeatured
              ? { ...styles.iconSection, ...styles.featuredIconSection }
              : styles.iconSection
          }
        >
          <Ionicons name="moon-outline" size={isFeatured ? 32 : 24} color={colors.primary[500]} />
        </View>
        <View style={isCompact ? { ...styles.content, ...styles.compactContent } : styles.content}>
          {isFeatured ? (
            <MarqueeText
              variant="h4"
              weight="semibold"
              style={styles.title}
              speed={25}
              pauseDuration={2000}
            >
              {dream.title}
            </MarqueeText>
          ) : (
            <Text variant="body" weight="semibold" numberOfLines={1} style={styles.title}>
              {dream.title}
            </Text>
          )}
          <View style={styles.metaRow}>
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
            <Text variant="caption" color="muted" style={styles.duration}>
              {formatDuration(dream.full_duration_seconds)}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <QueueButton dreamId={dream.id} size={18} />
          <FavoriteButton dreamId={dream.id} size={18} />
        </View>
        <View style={styles.playIcon}>
          <Ionicons name="play-circle-outline" size={28} color={colors.gray[500]} />
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minHeight: touchTargetMinSize,
  },
  featuredContainer: {
    width: 280,
    marginRight: 16,
    borderColor: colors.primary[900],
    flexDirection: 'column',
    padding: 16,
  },
  compactContainer: {
    padding: 10,
  },
  iconSection: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[800],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featuredIconSection: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 0,
    marginBottom: 12,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
  },
  compactContent: {
    justifyContent: 'center',
  },
  title: {
    color: colors.gray[100],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  duration: {
    fontFamily: fontFamily.regular,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 4,
  },
});
