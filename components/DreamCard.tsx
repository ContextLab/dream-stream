import { memo, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
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

  const handleCardPress = () => {
    router.push(`/dream/${dream.id}`);
  };

  return (
    <View style={containerStyle}>
      <Pressable style={styles.cardContent} onPress={handleCardPress}>
        {isFeatured && (
          <View style={{ ...styles.iconSection, ...styles.featuredIconSection }}>
            <Ionicons name="radio-outline" size={32} color={colors.primary[500]} />
          </View>
        )}
        <View style={isCompact ? { ...styles.content, ...styles.compactContent } : styles.content}>
          <MarqueeText
            variant={isFeatured ? 'h4' : 'body'}
            weight="semibold"
            style={styles.title}
            containerStyle={isFeatured ? styles.marqueeContainer : undefined}
            speed={25}
            pauseDuration={2000}
          >
            {dream.title}
          </MarqueeText>
          {dream.category && (
            <View style={styles.categoryRow}>
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: dream.category.color || colors.gray[500] },
                ]}
              />
              <MarqueeText
                variant="caption"
                color="secondary"
                speed={20}
                pauseDuration={2000}
                containerStyle={styles.categoryTextContainer}
              >
                {dream.category.name}
              </MarqueeText>
            </View>
          )}
        </View>
        <Text variant="caption" color="muted" style={styles.duration}>
          {formatDuration(dream.full_duration_seconds)}
        </Text>
      </Pressable>
      <View style={styles.actionButtons}>
        <QueueButton dreamId={dream.id} size={20} />
        <FavoriteButton dreamId={dream.id} size={20} />
      </View>
    </View>
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
    minWidth: 0, // Allow content to shrink below natural width for marquee to work
  },
  compactContent: {
    justifyContent: 'center',
  },
  title: {
    color: colors.gray[100],
  },
  marqueeContainer: {
    marginHorizontal: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    flexShrink: 0,
  },
  categoryTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  duration: {
    fontFamily: fontFamily.regular,
    flexShrink: 0,
    marginLeft: 8,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
});
