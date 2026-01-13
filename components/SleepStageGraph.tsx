import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
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

const STAGE_ORDER: SleepStage[] = ['awake', 'light', 'rem', 'deep'];
const STAGE_Y_POSITIONS: Record<SleepStage, number> = {
  awake: 0,
  light: 1,
  rem: 2,
  deep: 3,
  any: 2,
};

const GRAPH_HEIGHT = 160;
const GRAPH_PADDING_TOP = 20;
const GRAPH_PADDING_BOTTOM = 20;
const STAGE_LABELS_WIDTH = 50;
const USABLE_HEIGHT = GRAPH_HEIGHT - GRAPH_PADDING_TOP - GRAPH_PADDING_BOTTOM;

const INITIAL_DURATION_MS = 10000;
const RENDER_INTERVAL_MS = 10;
const DATA_POINT_INTERVAL_MS = 10000;
const GROWTH_THRESHOLD = 0.95;
const GROWTH_FACTOR = 1.05;
const LINE_THICKNESS = 4;
const TRANSITION_COLOR = colors.gray[500];

function getYForStage(stage: SleepStage): number {
  const position = STAGE_Y_POSITIONS[stage];
  return GRAPH_PADDING_TOP + (position / 3) * USABLE_HEIGHT;
}

interface DataPoint {
  x: number;
  y: number;
  stage: SleepStage;
  timestamp: number;
}

export function SleepStageGraph({
  stages,
  currentStage,
  isTracking,
  sessionStartTime,
  onStagePress,
}: SleepStageGraphProps) {
  const [graphWidth, setGraphWidth] = useState(300);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [currentDuration, setCurrentDuration] = useState(INITIAL_DURATION_MS);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const scaleAnimation = useSharedValue(1);
  const renderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastStageRef = useRef<SleepStage | null>(null);

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setGraphWidth(event.nativeEvent.layout.width - STAGE_LABELS_WIDTH - spacing.md);
  }, []);

  useEffect(() => {
    if (!isTracking) {
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
        renderIntervalRef.current = null;
      }
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
      }
      return;
    }

    startTimeRef.current = sessionStartTime ?? Date.now();
    lastStageRef.current = currentStage;
    setCurrentDuration(INITIAL_DURATION_MS);
    setDataPoints([]);

    const addDataPoint = (stage: SleepStage) => {
      const now = Date.now();
      setDataPoints((prev) => {
        const newPoints = [...prev, { x: 0, y: 0, stage, timestamp: now }];
        return newPoints.slice(-500);
      });
    };

    addDataPoint(currentStage ?? 'awake');

    const updateRender = () => {
      const now = Date.now();
      setCurrentTime(now);

      const elapsed = now - startTimeRef.current;
      setCurrentDuration((prevDuration) => {
        if (elapsed >= prevDuration * GROWTH_THRESHOLD) {
          const newDuration = prevDuration * GROWTH_FACTOR;
          scaleAnimation.value = withTiming(1, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
          });
          return newDuration;
        }
        return prevDuration;
      });
    };

    const addPeriodicPoint = () => {
      const stage = currentStage ?? 'awake';
      addDataPoint(stage);
    };

    renderIntervalRef.current = setInterval(updateRender, RENDER_INTERVAL_MS);
    dataIntervalRef.current = setInterval(addPeriodicPoint, DATA_POINT_INTERVAL_MS);

    return () => {
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
        renderIntervalRef.current = null;
      }
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
        dataIntervalRef.current = null;
      }
    };
  }, [isTracking, sessionStartTime, scaleAnimation]);

  useEffect(() => {
    if (!isTracking) return;

    if (currentStage !== lastStageRef.current && currentStage !== null) {
      lastStageRef.current = currentStage;
      const now = Date.now();
      setDataPoints((prev) => {
        const newPoints = [...prev, { x: 0, y: 0, stage: currentStage, timestamp: now }];
        return newPoints.slice(-500);
      });
    }
  }, [currentStage, isTracking]);

  const computedPoints = useMemo(() => {
    if (dataPoints.length === 0) return [];

    const startTime = startTimeRef.current || (dataPoints[0]?.timestamp ?? Date.now());

    const points = dataPoints.map((point) => {
      const elapsed = point.timestamp - startTime;
      const x = (elapsed / currentDuration) * graphWidth;
      const y = getYForStage(point.stage);
      return { ...point, x, y };
    });

    if (isTracking && points.length > 0) {
      const lastPoint = points[points.length - 1];
      const elapsed = currentTime - startTime;
      const liveX = Math.min((elapsed / currentDuration) * graphWidth, graphWidth);
      points.push({
        ...lastPoint,
        x: liveX,
        timestamp: currentTime,
      });
    }

    return points;
  }, [dataPoints, currentDuration, graphWidth, currentTime, isTracking]);

  const renderPath = useCallback(() => {
    if (computedPoints.length < 2) {
      if (computedPoints.length === 1 && isTracking) {
        const p = computedPoints[0];
        return (
          <View
            style={[
              styles.currentDot,
              {
                left: p.x - 6,
                top: p.y - 6,
                backgroundColor: getSleepStageColor(p.stage),
              },
            ]}
          />
        );
      }
      return null;
    }

    const segments: React.ReactNode[] = [];

    for (let i = 1; i < computedPoints.length; i++) {
      const prev = computedPoints[i - 1];
      const curr = computedPoints[i];

      const isTransition = prev.stage !== curr.stage;
      const segmentColor = isTransition ? TRANSITION_COLOR : getSleepStageColor(prev.stage);

      if (Platform.OS === 'web') {
        const midX = (prev.x + curr.x) / 2;
        const pathD = `M ${prev.x} ${prev.y} C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;

        segments.push(
          <path
            key={`seg-${i}`}
            d={pathD}
            fill="none"
            stroke={segmentColor}
            strokeWidth={LINE_THICKNESS}
            strokeLinecap="round"
          />
        );
      } else {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        segments.push(
          <View
            key={`seg-${i}`}
            style={[
              styles.lineSegment,
              {
                left: prev.x,
                top: prev.y - LINE_THICKNESS / 2,
                width: length,
                height: LINE_THICKNESS,
                backgroundColor: segmentColor,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              },
            ]}
          />
        );
      }
    }

    if (isTracking && computedPoints.length > 0) {
      const last = computedPoints[computedPoints.length - 1];
      segments.push(
        <View
          key="current-dot"
          style={[
            styles.currentDot,
            {
              left: last.x - 6,
              top: last.y - 6,
              backgroundColor: getSleepStageColor(last.stage),
            },
          ]}
        />
      );
    }

    if (Platform.OS === 'web') {
      return (
        <svg
          width={graphWidth}
          height={GRAPH_HEIGHT}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {segments}
        </svg>
      );
    }

    return <>{segments}</>;
  }, [computedPoints, graphWidth, isTracking]);

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

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleAnimation.value }],
  }));

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
        <Animated.View style={[styles.pathContainer, scaleStyle]}>{renderPath()}</Animated.View>
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
    borderRadius: 2,
  },
  currentDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
