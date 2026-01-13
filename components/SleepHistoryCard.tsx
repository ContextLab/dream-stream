import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { SleepSession } from '@/services/sleep';
import { calculateSleepSummary, getSleepStageColor } from '@/services/sleep';

interface SleepHistoryCardProps {
  session: SleepSession;
  onPress: () => void;
  onDelete?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeRange(start: string, end: string | null): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();

  const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `${startTime} - ${endTime}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function SleepHistoryCard({ session, onPress, onDelete }: SleepHistoryCardProps) {
  const summary = calculateSleepSummary(session);

  const stageBarData = [
    { stage: 'awake', minutes: summary.awakeMinutes, color: getSleepStageColor('awake') },
    { stage: 'light', minutes: summary.lightMinutes, color: getSleepStageColor('light') },
    { stage: 'deep', minutes: summary.deepMinutes, color: getSleepStageColor('deep') },
    { stage: 'rem', minutes: summary.remMinutes, color: getSleepStageColor('rem') },
  ];

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.dateSection}>
          <Ionicons name="bed" size={16} color={colors.primary[400]} />
          <Text variant="bodySmall" weight="semibold" color="primary">
            {formatDate(session.startTime)}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text variant="caption" color="muted">
            {formatTimeRange(session.startTime, session.endTime)}
          </Text>
          {onDelete && (
            <Pressable
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={16} color={colors.gray[500]} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.stageBar}>
        {stageBarData.map((item, index) => {
          const width =
            summary.totalDurationMinutes > 0
              ? (item.minutes / summary.totalDurationMinutes) * 100
              : 0;
          if (width === 0) return null;
          return (
            <View
              key={item.stage}
              style={[
                styles.stageSegment,
                { backgroundColor: item.color, width: `${width}%` },
                index === 0 && styles.stageSegmentFirst,
                index === stageBarData.length - 1 && styles.stageSegmentLast,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="caption" color="muted">
            Duration
          </Text>
          <Text variant="caption" weight="semibold" color="primary">
            {formatDuration(summary.totalDurationMinutes)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="caption" color="muted">
            REM
          </Text>
          <Text variant="caption" weight="semibold" style={{ color: getSleepStageColor('rem') }}>
            {summary.remPercentage}%
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="caption" color="muted">
            Efficiency
          </Text>
          <Text variant="caption" weight="semibold" color="primary">
            {summary.sleepEfficiency}%
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray[500]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  stageBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.gray[800],
    marginBottom: spacing.sm,
  },
  stageSegment: {
    height: '100%',
  },
  stageSegmentFirst: {
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  stageSegmentLast: {
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
});
