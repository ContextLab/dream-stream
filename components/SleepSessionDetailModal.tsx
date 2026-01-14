import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { SleepSession } from '@/services/sleep';
import {
  calculateSleepSummary,
  getSleepStageColor,
  getSleepStageDisplayName,
} from '@/services/sleep';
import type { SleepStage } from '@/types/database';

interface SleepSessionDetailModalProps {
  session: SleepSession | null;
  visible: boolean;
  onClose: () => void;
}

const GRAPH_HEIGHT = 200;
const STAGE_ORDER: SleepStage[] = ['awake', 'light', 'deep', 'rem'];
const STAGE_Y_POSITIONS: Record<SleepStage, number> = {
  awake: 0,
  light: 1,
  deep: 2,
  rem: 3,
  any: 2,
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
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
  if (hours === 0) return `${mins} minutes`;
  if (mins === 0) return `${hours} hours`;
  return `${hours}h ${mins}m`;
}

function getYForStage(stage: SleepStage, height: number): number {
  const padding = 20;
  const usableHeight = height - padding * 2;
  const position = STAGE_Y_POSITIONS[stage];
  return padding + (position / 3) * usableHeight;
}

export function SleepSessionDetailModal({
  session,
  visible,
  onClose,
}: SleepSessionDetailModalProps) {
  if (!session) return null;

  const summary = calculateSleepSummary(session);
  const screenWidth = Dimensions.get('window').width;
  const graphWidth = screenWidth - spacing.lg * 4;

  const startTime = new Date(session.startTime).getTime();
  const endTime = session.endTime ? new Date(session.endTime).getTime() : Date.now();
  const totalDuration = endTime - startTime;

  const stageSegments = session.stages.map((record, index) => {
    const segmentStart = new Date(record.startTime).getTime();
    const segmentEnd = record.endTime ? new Date(record.endTime).getTime() : endTime;

    const startX = ((segmentStart - startTime) / totalDuration) * graphWidth;
    const endX = ((segmentEnd - startTime) / totalDuration) * graphWidth;
    const y = getYForStage(record.stage, GRAPH_HEIGHT);

    return {
      stage: record.stage,
      startX,
      endX,
      y,
      duration: record.durationMinutes,
    };
  });

  const stageStats = [
    { stage: 'awake' as SleepStage, label: 'Awake', minutes: summary.awakeMinutes },
    { stage: 'light' as SleepStage, label: 'Light Sleep', minutes: summary.lightMinutes },
    { stage: 'deep' as SleepStage, label: 'Deep Sleep', minutes: summary.deepMinutes },
    { stage: 'rem' as SleepStage, label: 'REM Sleep', minutes: summary.remMinutes },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.closeButton} />
          <Heading variant="h3" color="primary">
            Sleep Details
          </Heading>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close sleep details"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={colors.gray[400]} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.dateSection}>
            <Ionicons name="bed" size={20} color={colors.primary[400]} />
            <Text variant="body" weight="semibold" color="primary">
              {formatDate(session.startTime)}
            </Text>
            <Text variant="caption" color="muted">
              {formatTimeRange(session.startTime, session.endTime)}
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text variant="caption" color="muted">
                Total Sleep
              </Text>
              <Text variant="body" weight="bold" color="primary">
                {formatDuration(summary.totalDurationMinutes)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text variant="caption" color="muted">
                Efficiency
              </Text>
              <Text variant="body" weight="bold" color="primary">
                {summary.sleepEfficiency}%
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text variant="caption" color="muted">
                REM
              </Text>
              <Text variant="body" weight="bold" style={{ color: getSleepStageColor('rem') }}>
                {summary.remPercentage}%
              </Text>
            </View>
          </View>

          <View style={styles.graphSection}>
            <Text variant="body" weight="semibold" color="primary" style={styles.sectionTitle}>
              Sleep Stages Over Time
            </Text>

            <View style={styles.graphContainer}>
              <View style={styles.graphLabels}>
                {STAGE_ORDER.map((stage) => (
                  <View
                    key={stage}
                    style={[styles.graphLabel, { top: getYForStage(stage, GRAPH_HEIGHT) - 8 }]}
                  >
                    <View
                      style={[styles.stageDot, { backgroundColor: getSleepStageColor(stage) }]}
                    />
                    <Text variant="caption" color="muted">
                      {stage === 'rem' ? 'REM' : stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[styles.graph, { width: graphWidth }]}>
                {STAGE_ORDER.map((stage) => (
                  <View
                    key={stage}
                    style={[styles.gridLine, { top: getYForStage(stage, GRAPH_HEIGHT) }]}
                  />
                ))}

                {stageSegments.map((segment, index) => {
                  const nextSegment = stageSegments[index + 1];
                  return (
                    <View key={index}>
                      <View
                        style={[
                          styles.stageSegment,
                          {
                            left: segment.startX,
                            top: segment.y - 4,
                            width: segment.endX - segment.startX,
                            backgroundColor: getSleepStageColor(segment.stage),
                          },
                        ]}
                      />
                      {nextSegment && (
                        <View
                          style={[
                            styles.stageTransition,
                            {
                              left: segment.endX - 1,
                              top: Math.min(segment.y, nextSegment.y),
                              height: Math.abs(nextSegment.y - segment.y) + 8,
                              backgroundColor: colors.gray[600],
                            },
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.breakdownSection}>
            <Text variant="body" weight="semibold" color="primary" style={styles.sectionTitle}>
              Stage Breakdown
            </Text>

            {stageStats.map((stat) => (
              <View key={stat.stage} style={styles.breakdownRow}>
                <View style={styles.breakdownLabel}>
                  <View
                    style={[styles.stageDot, { backgroundColor: getSleepStageColor(stat.stage) }]}
                  />
                  <Text variant="body" color="primary">
                    {stat.label}
                  </Text>
                </View>
                <View style={styles.breakdownValue}>
                  <Text variant="body" color="muted">
                    {formatDuration(stat.minutes)}
                  </Text>
                  <Text variant="body" weight="semibold" color="primary">
                    {summary.totalDurationMinutes > 0
                      ? Math.round((stat.minutes / summary.totalDurationMinutes) * 100)
                      : 0}
                    %
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  dateSection: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  graphSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  graphContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    overflow: 'hidden',
  },
  graphLabels: {
    width: 50,
    height: GRAPH_HEIGHT,
    position: 'relative',
  },
  graphLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  graph: {
    height: GRAPH_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.gray[800],
  },
  stageSegment: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
  },
  stageTransition: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  breakdownSection: {
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
