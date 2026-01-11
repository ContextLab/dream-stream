import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import {
  startSleepSession,
  endSleepSession,
  onSleepStageChange,
  getSleepStageDisplayName,
  getSleepStageColor,
  type BreathingAnalysis,
} from '@/services/sleep';
import type { SleepStage } from '@/types/database';
import { colors, darkTheme, spacing, borderRadius } from '@/theme/tokens';

interface DebugState {
  isRunning: boolean;
  currentStage: SleepStage | null;
  stageHistory: { stage: SleepStage; time: string }[];
  lastAnalysis: BreathingAnalysis | null;
  error: string | null;
}

export function SleepDebugPanel() {
  const [state, setState] = useState<DebugState>({
    isRunning: false,
    currentStage: null,
    stageHistory: [],
    lastAnalysis: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onSleepStageChange((stage) => {
      const time = new Date().toLocaleTimeString();
      setState((prev) => ({
        ...prev,
        currentStage: stage,
        stageHistory: [{ stage, time }, ...prev.stageHistory.slice(0, 19)],
      }));
    });
    return unsubscribe;
  }, []);

  const handleStart = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));
      await startSleepSession('audio');
      setState((prev) => ({ ...prev, isRunning: true }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to start',
      }));
    }
  }, []);

  const handleStop = useCallback(async () => {
    try {
      await endSleepSession();
      setState((prev) => ({ ...prev, isRunning: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to stop',
      }));
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sleep Detection Debug</Text>

      <View style={styles.controls}>
        {!state.isRunning ? (
          <Button onPress={handleStart} variant="primary">
            Start Audio Detection
          </Button>
        ) : (
          <Button onPress={handleStop} variant="secondary">
            Stop Detection
          </Button>
        )}
      </View>

      {state.error && <Text style={styles.error}>{state.error}</Text>}

      <View style={styles.statusRow}>
        <Text style={styles.label}>Status:</Text>
        <Text
          style={[styles.value, { color: state.isRunning ? colors.success : darkTheme.textMuted }]}
        >
          {state.isRunning ? 'Listening...' : 'Stopped'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Current Stage:</Text>
        {state.currentStage ? (
          <View
            style={[styles.stageBadge, { backgroundColor: getSleepStageColor(state.currentStage) }]}
          >
            <Text style={styles.stageText}>{getSleepStageDisplayName(state.currentStage)}</Text>
          </View>
        ) : (
          <Text style={styles.value}>--</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Stage History</Text>
      <ScrollView style={styles.historyList}>
        {state.stageHistory.length === 0 ? (
          <Text style={styles.emptyText}>No stage changes yet</Text>
        ) : (
          state.stageHistory.map((entry, i) => (
            <View key={i} style={styles.historyRow}>
              <Text style={styles.historyTime}>{entry.time}</Text>
              <View
                style={[styles.historyBadge, { backgroundColor: getSleepStageColor(entry.stage) }]}
              >
                <Text style={styles.historyStage}>{getSleepStageDisplayName(entry.stage)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Text style={styles.instructions}>
        Instructions:{'\n'}
        1. Click "Start Audio Detection"{'\n'}
        2. Grant microphone permission{'\n'}
        3. Breathe slowly and regularly near the mic{'\n'}
        4. Watch for stage transitions{'\n'}
        {'\n'}
        Detection thresholds:{'\n'}• Awake: irregular breathing or movement{'\n'}• Light: regular
        breathing (8-16 bpm){'\n'}• Deep: very regular, slow breathing (&lt;12 bpm){'\n'}• REM:
        variable rate, faster breathing (&gt;16 bpm)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: darkTheme.surface,
    borderRadius: borderRadius.lg,
    margin: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.text,
    marginBottom: spacing.md,
  },
  controls: {
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    color: darkTheme.textMuted,
    marginRight: spacing.sm,
    width: 100,
  },
  value: {
    color: darkTheme.text,
    fontWeight: '500',
  },
  stageBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  stageText: {
    color: darkTheme.text,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  historyList: {
    maxHeight: 150,
    marginBottom: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyTime: {
    color: darkTheme.textMuted,
    fontSize: 12,
    width: 80,
  },
  historyBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  historyStage: {
    color: darkTheme.text,
    fontSize: 11,
  },
  emptyText: {
    color: darkTheme.textMuted,
    fontStyle: 'italic',
  },
  instructions: {
    color: darkTheme.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
