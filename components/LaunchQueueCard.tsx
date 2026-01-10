import { memo } from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { getStatusDisplayName, getStatusColor } from '@/services/launchQueue';
import { getSleepStageDisplayName } from '@/services/sleep';
import { colors, spacing, borderRadius, shadows, touchTargetMinSize } from '@/theme/tokens';
import type { QueuedDream } from '@/services/launchQueue';

interface LaunchQueueCardProps {
  item: QueuedDream;
  onRemove?: () => void;
  onSetReady?: () => void;
  onLaunch?: () => void;
  isActive?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const LaunchQueueCard = memo(function LaunchQueueCard({
  item,
  onRemove,
  onSetReady,
  onLaunch,
  isActive = false,
}: LaunchQueueCardProps) {
  const statusColor = getStatusColor(item.status);
  const statusName = getStatusDisplayName(item.status);
  const targetStage = item.target_sleep_stage
    ? getSleepStageDisplayName(item.target_sleep_stage)
    : 'Any stage';

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.dream.thumbnail_url }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.durationBadge}>
          <Text variant="caption" style={styles.durationText}>
            {formatDuration(item.dream.duration_seconds)}
          </Text>
        </View>
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
            <Ionicons name="moon-outline" size={12} color={colors.gray[400]} />
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  containerActive: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  imageContainer: {
    width: 100,
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 10,
  },
  content: {
    flex: 1,
    padding: spacing.sm,
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
});
