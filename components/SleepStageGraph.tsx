import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { SleepStage } from '@/types/database';
import { getSleepStageColor } from '@/services/sleep';

interface StageHistoryEntry {
  stage: SleepStage;
  timestamp: number;
}

interface SleepStageGraphProps {
  stages: StageHistoryEntry[];
  currentStage: SleepStage | null;
  isTracking: boolean;
  sessionStartTime?: number;
  onStagePress?: (stage: SleepStage, timestamp: number) => void;
}

const STAGE_ORDER: SleepStage[] = ['awake', 'light', 'deep', 'rem'];
const STAGE_Y_POSITIONS: Record<SleepStage, number> = {
  awake: 0,
  light: 1,
  deep: 2,
  rem: 3,
  any: 2,
};

const GRAPH_HEIGHT = 160;
const GRAPH_PADDING_TOP = 20;
const GRAPH_PADDING_BOTTOM = 20;
const STAGE_LABELS_WIDTH = 50;
const USABLE_HEIGHT = GRAPH_HEIGHT - GRAPH_PADDING_TOP - GRAPH_PADDING_BOTTOM;

function getYForStage(stage: SleepStage): number {
  const position = STAGE_Y_POSITIONS[stage];
  return GRAPH_PADDING_TOP + (position / 3) * USABLE_HEIGHT;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function PulsingDot({ x, y, color }: { x: number; y: number; color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.currentDot,
        { left: x - 8, top: y - 8, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

function AnimatedDataPoint({
  x,
  y,
  color,
  delay,
  onPress,
}: {
  x: number;
  y: number;
  color: string;
  delay: number;
  onPress?: () => void;
}) {
  const animatedX = useSharedValue(x + 50);
  const animatedOpacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      animatedX.value = withSpring(x, { damping: 15, stiffness: 100 });
      animatedOpacity.value = withTiming(1, { duration: 300 });
    }, delay);
    return () => clearTimeout(timer);
  }, [x, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    left: animatedX.value - 4,
    top: y - 4,
    opacity: animatedOpacity.value,
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.dataPoint, { backgroundColor: color }, animatedStyle]} />
    </Pressable>
  );
}

const PIXELS_PER_MINUTE = 8;
const MIN_GRAPH_DURATION_MS = 5 * 60 * 1000;

export function SleepStageGraph({
  stages,
  currentStage,
  isTracking,
  sessionStartTime,
  onStagePress,
}: SleepStageGraphProps) {
  const [selectedPoint, setSelectedPoint] = useState<StageHistoryEntry | null>(null);
  const [graphWidth, setGraphWidth] = useState(300);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);

    return () => clearInterval(interval);
  }, [isTracking]);

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setGraphWidth(event.nativeEvent.layout.width - STAGE_LABELS_WIDTH - spacing.md);
  }, []);

  const handlePointPress = useCallback(
    (entry: StageHistoryEntry) => {
      setSelectedPoint(entry);
      onStagePress?.(entry.stage, entry.timestamp);
      setTimeout(() => setSelectedPoint(null), 3000);
    },
    [onStagePress]
  );

  const renderPath = useCallback(() => {
    if (stages.length === 0 && !isTracking) return null;

    const startTime = sessionStartTime ?? stages[0]?.timestamp ?? Date.now();
    const endTime = isTracking ? currentTime : (stages[stages.length - 1]?.timestamp ?? Date.now());
    const elapsedMs = Math.max(endTime - startTime, MIN_GRAPH_DURATION_MS);
    const elapsedMinutes = elapsedMs / 60000;
    const calculatedWidth = elapsedMinutes * PIXELS_PER_MINUTE;
    const effectiveWidth = Math.max(graphWidth, calculatedWidth);

    const points = stages.map((entry) => {
      const x = ((entry.timestamp - startTime) / elapsedMs) * effectiveWidth;
      const y = getYForStage(entry.stage);
      return { x, y, entry };
    });

    const pathD =
      points.length >= 2
        ? points
            .map((p, i) => {
              if (i === 0) return `M ${p.x} ${p.y}`;
              const prev = points[i - 1];
              const midX = (prev.x + p.x) / 2;
              return `C ${midX} ${prev.y}, ${midX} ${p.y}, ${p.x} ${p.y}`;
            })
            .join(' ')
        : '';

    const currentX = isTracking ? effectiveWidth : (points[points.length - 1]?.x ?? 0);

    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: effectiveWidth, height: GRAPH_HEIGHT }}
        onContentSizeChange={() => {
          if (isTracking && scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }}
      >
        <View style={[styles.pathContainer, { width: effectiveWidth }]}>
          {Platform.OS === 'web' ? (
            <svg width={effectiveWidth} height={GRAPH_HEIGHT} style={{ position: 'absolute' }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.primary[600]} />
                  <stop offset="100%" stopColor={colors.primary[400]} />
                </linearGradient>
              </defs>
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            points.slice(1).map((p, i) => {
              const prev = points[i];
              return (
                <View
                  key={i}
                  style={[
                    styles.lineSegment,
                    {
                      left: prev.x,
                      top: Math.min(prev.y, p.y),
                      width: p.x - prev.x,
                      height: Math.abs(p.y - prev.y) + 2,
                      backgroundColor: colors.primary[500],
                    },
                  ]}
                />
              );
            })
          )}

          {points.map((p, i) => (
            <AnimatedDataPoint
              key={`${p.entry.timestamp}-${i}`}
              x={p.x}
              y={p.y}
              color={getSleepStageColor(p.entry.stage)}
              delay={i * 50}
              onPress={() => handlePointPress(p.entry)}
            />
          ))}

          {isTracking && currentStage && (
            <PulsingDot
              x={currentX}
              y={getYForStage(currentStage)}
              color={getSleepStageColor(currentStage)}
            />
          )}
        </View>
      </ScrollView>
    );
  }, [
    stages,
    graphWidth,
    isTracking,
    currentStage,
    currentTime,
    sessionStartTime,
    handlePointPress,
  ]);

  const renderGridLines = useCallback(() => {
    return STAGE_ORDER.map((stage) => {
      const y = getYForStage(stage);
      return <View key={stage} style={[styles.gridLine, { top: y }]} />;
    });
  }, []);

  const renderStageLabels = useCallback(() => {
    return STAGE_ORDER.map((stage) => {
      const y = getYForStage(stage);
      const label = stage === 'rem' ? 'REM' : stage.charAt(0).toUpperCase() + stage.slice(1);
      return (
        <View key={stage} style={[styles.stageLabel, { top: y - 8 }]}>
          <View style={[styles.stageDot, { backgroundColor: getSleepStageColor(stage) }]} />
          <Text variant="caption" color="muted" style={styles.stageLabelText}>
            {label}
          </Text>
        </View>
      );
    });
  }, []);

  if (!isTracking && stages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodySmall" color="muted" align="center">
          Sleep stage data will appear here once tracking begins
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.labelsContainer}>{renderStageLabels()}</View>
      <View style={styles.graphArea}>
        {renderGridLines()}
        {renderPath()}
        {selectedPoint && (
          <View style={styles.tooltip}>
            <Text variant="caption" color="primary">
              {getSleepStageColor(selectedPoint.stage) === '#22C55E' ? 'REM' : selectedPoint.stage}
            </Text>
            <Text variant="caption" color="muted">
              {formatTime(selectedPoint.timestamp)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    height: GRAPH_HEIGHT + spacing.md * 2,
  },
  emptyContainer: {
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    height: GRAPH_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelsContainer: {
    width: STAGE_LABELS_WIDTH,
    height: GRAPH_HEIGHT,
    position: 'relative',
  },
  stageLabel: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageLabelText: {
    fontSize: 10,
  },
  graphArea: {
    flex: 1,
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
  pathContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    opacity: 0.6,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  currentDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.gray[800],
    padding: spacing.xs,
    borderRadius: borderRadius.md,
    gap: 2,
  },
});
