import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import {
  startCalibrationTest,
  stopCalibrationTest,
  onBreathingAnalysis,
  onRawAudioLevel,
  getSleepStageDisplayName,
  getSleepStageColor,
  getAGCStatus,
  type BreathingAnalysis,
} from '@/services/sleep';
import {
  getCurrentAudioSource,
  checkBluetoothAvailability,
  type AudioSource,
} from '@/services/nativeAudio';
import { useHealth } from '@/hooks/useHealth';
import { colors, spacing, borderRadius } from '@/theme/tokens';

interface SensorCalibrationProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type CalibrationStatus = 'idle' | 'requesting' | 'calibrating' | 'ready' | 'error';

const SIGNAL_THRESHOLD = 0.02;

export function SensorCalibration({ onComplete, onSkip }: SensorCalibrationProps) {
  const [status, setStatus] = useState<CalibrationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [breathingData, setBreathingData] = useState<BreathingAnalysis | null>(null);
  const [micDetected, setMicDetected] = useState(false);
  const [hrDetected, setHrDetected] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('phone');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(null);
  const [agcGain, setAgcGain] = useState(1.0);
  const [breathCount, setBreathCount] = useState(0);
  const [lastBreathTime, setLastBreathTime] = useState<number | null>(null);
  const [timeSinceBreath, setTimeSinceBreath] = useState<number | null>(null);

  const { vitals, status: hcStatus, refreshVitals, platform, requestPermissions } = useHealth();
  const isNativeMobile = platform === 'ios' || platform === 'android';

  const unsubscribeBreathingRef = useRef<(() => void) | null>(null);
  const unsubscribeAudioRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const levelHeight = useSharedValue(4);
  const stageScale = useSharedValue(1);
  const breathPulseScale = useSharedValue(1);
  const breathPulseOpacity = useSharedValue(0.3);

  const sensorReady = micDetected || hrDetected;

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (status === 'calibrating' && isNativeMobile && hcStatus?.permissionsGranted) {
      refreshVitals();
      const interval = setInterval(() => {
        refreshVitals();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, isNativeMobile, hcStatus?.permissionsGranted, refreshVitals]);

  useEffect(() => {
    if (vitals?.heartRate !== null && vitals?.heartRate !== undefined && vitals.heartRate > 0) {
      if (!hrDetected) {
        setHrDetected(true);
        stageScale.value = withTiming(1.08, { duration: 300 }, () => {
          stageScale.value = withTiming(1, { duration: 300 });
        });
      }
    }
  }, [vitals?.heartRate, hrDetected, stageScale]);

  useEffect(() => {
    if (sensorReady && status === 'calibrating') {
      setStatus('ready');
    }
  }, [sensorReady, status]);

  useEffect(() => {
    if (status !== 'calibrating' || lastBreathTime === null) {
      setTimeSinceBreath(null);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastBreathTime) / 1000;
      setTimeSinceBreath(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [status, lastBreathTime]);

  const cleanup = useCallback(() => {
    if (unsubscribeBreathingRef.current) {
      unsubscribeBreathingRef.current();
      unsubscribeBreathingRef.current = null;
    }
    if (unsubscribeAudioRef.current) {
      unsubscribeAudioRef.current();
      unsubscribeAudioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopCalibrationTest();
  }, []);

  const startCalibration = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage(null);
    setBreathingData(null);
    setMicDetected(false);
    setHrDetected(false);

    try {
      const success = await startCalibrationTest();

      if (!success) {
        setStatus('error');
        if (Platform.OS === 'web') {
          setErrorMessage('Could not access microphone. Please check your browser settings.');
        } else {
          setErrorMessage(
            'Microphone access not available. Please ensure the app has microphone permission.'
          );
        }
        return;
      }

      setStatus('calibrating');

      if (Platform.OS !== 'web') {
        setAudioSource(getCurrentAudioSource());
        const btInfo = await checkBluetoothAvailability();
        if (btInfo.headsetConnected) {
          setBluetoothDeviceName(btInfo.deviceName);
        }
      }

      unsubscribeAudioRef.current = onRawAudioLevel((rms) => {
        const normalized = Math.min(rms * 10, 1);
        setAudioLevel(normalized);
        levelHeight.value = withSpring(4 + normalized * 80, { damping: 15, stiffness: 150 });

        const agcStatus = getAGCStatus();
        setAgcGain(agcStatus.currentGain);

        if (!micDetected && normalized > SIGNAL_THRESHOLD) {
          setMicDetected(true);
          stageScale.value = withTiming(1.08, { duration: 300 }, () => {
            stageScale.value = withTiming(1, { duration: 300 });
          });
        }
      });

      unsubscribeBreathingRef.current = onBreathingAnalysis((analysis) => {
        setBreathingData(analysis);

        if (analysis.lastBreathTime !== null) {
          setLastBreathTime(analysis.lastBreathTime);
          setBreathCount(analysis.recentBreathTimes.length);

          const timeSinceLastBreath = Date.now() - analysis.lastBreathTime;
          if (timeSinceLastBreath < 500) {
            breathPulseScale.value = withSequence(
              withTiming(1.15, { duration: 200, easing: Easing.out(Easing.cubic) }),
              withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) })
            );
            breathPulseOpacity.value = withSequence(
              withTiming(0.8, { duration: 200 }),
              withTiming(0.3, { duration: 600 })
            );
          }
        }
      });
    } catch (err) {
      console.warn('Sensor calibration error:', err);
      setStatus('error');

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setErrorMessage('Microphone access denied. Please allow access in device settings.');
        } else if (err.name === 'NotFoundError') {
          setErrorMessage('No microphone found. Please connect a microphone and try again.');
        } else {
          setErrorMessage('Could not access microphone. Please check your device settings.');
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
  }, [levelHeight, stageScale, micDetected, breathPulseScale, breathPulseOpacity]);

  const handleComplete = useCallback(() => {
    cleanup();
    onComplete();
  }, [cleanup, onComplete]);

  const handleSkip = useCallback(() => {
    cleanup();
    onSkip?.();
  }, [cleanup, onSkip]);

  const levelStyle = useAnimatedStyle(() => ({
    height: levelHeight.value,
  }));

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stageScale.value }],
  }));

  const breathPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathPulseScale.value }],
    opacity: breathPulseOpacity.value,
  }));

  const estimatedStage = breathingData?.estimatedStage ?? 'awake';
  const regularity = breathingData?.regularity ?? 0;
  const confidence = breathingData?.confidenceScore ?? 0;
  const stageColor = getSleepStageColor(sensorReady ? estimatedStage : 'awake');
  const stageName = sensorReady ? getSleepStageDisplayName(estimatedStage) : 'Awake';

  const isCalibrating = status === 'calibrating' || status === 'ready';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="pulse" size={48} color={colors.primary[400]} />
        <Text variant="h3" weight="bold" color="primary" style={styles.title}>
          Sensor Calibration
        </Text>
        <Text variant="body" color="secondary" align="center" style={styles.description}>
          {isNativeMobile
            ? 'Calibrating microphone and heart rate sensors for sleep tracking.'
            : 'Calibrating microphone for sleep tracking.'}
        </Text>
      </View>

      <View style={styles.testSection}>
        {status === 'idle' && (
          <>
            <View style={styles.instructions}>
              <Text variant="bodySmall" color="muted" align="center">
                {isNativeMobile
                  ? 'Place your device nearby and ensure your wearable is connected. The calibration will detect your breathing and heart rate.'
                  : 'Place your device nearby. The calibration will detect ambient audio to prepare for sleep tracking.'}
              </Text>
            </View>
            <Button variant="primary" onPress={startCalibration} style={styles.testButton}>
              Start Calibration
            </Button>
          </>
        )}

        {status === 'requesting' && (
          <>
            <Ionicons name="hourglass-outline" size={64} color={colors.gray[400]} />
            <Text variant="body" color="secondary" align="center">
              Requesting sensor access...
            </Text>
            <Text variant="caption" color="muted" align="center">
              Please allow access when prompted
            </Text>
          </>
        )}

        {isCalibrating && (
          <>
            <View style={styles.visualizationRow}>
              <View style={styles.levelSection}>
                <Text variant="caption" color="muted" style={styles.sectionLabel}>
                  Mic Level
                </Text>
                <View style={styles.levelBarContainer}>
                  <Animated.View style={[styles.levelBar, levelStyle]} />
                </View>
                <Text variant="caption" color="muted">
                  {Math.round(audioLevel * 100)}%
                </Text>
              </View>

              <View style={styles.breathSection}>
                <Animated.View style={[styles.breathPulseRing, breathPulseStyle]} />
                <Animated.View style={[styles.stageCircle, stageStyle]}>
                  <View
                    style={[
                      styles.stageInner,
                      { borderColor: sensorReady ? stageColor : colors.gray[700] },
                    ]}
                  >
                    <Text
                      variant="body"
                      weight="bold"
                      style={{
                        color: sensorReady ? stageColor : colors.gray[500],
                      }}
                    >
                      {sensorReady ? stageName : 'Calibrating...'}
                    </Text>
                    {sensorReady && breathingData?.breathsPerMinute ? (
                      <Text variant="caption" style={{ color: colors.info }}>
                        {Math.round(breathingData.breathsPerMinute)} BPM
                      </Text>
                    ) : (
                      <Text variant="caption" color={sensorReady ? 'secondary' : 'muted'}>
                        {sensorReady ? 'Sleep Stage' : 'Waiting...'}
                      </Text>
                    )}
                  </View>
                </Animated.View>
                {timeSinceBreath !== null && timeSinceBreath < 10 && (
                  <View style={styles.breathTimerContainer}>
                    <Text variant="caption" color="muted">
                      {timeSinceBreath.toFixed(1)}s
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.statsSection}>
                <Text variant="caption" color="muted" style={styles.sectionLabel}>
                  Stats
                </Text>
                <View style={styles.statRow}>
                  <Text variant="caption" color="secondary">
                    Regularity
                  </Text>
                  <Text variant="caption" color="primary">
                    {Math.round(regularity * 100)}%
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="caption" color="secondary">
                    Confidence
                  </Text>
                  <Text variant="caption" color="primary">
                    {Math.round(confidence * 100)}%
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text variant="caption" color="secondary">
                    AGC Gain
                  </Text>
                  <Text variant="caption" color={agcGain > 2 ? 'primary' : 'muted'}>
                    {agcGain.toFixed(1)}x
                  </Text>
                </View>
                {breathCount > 0 && (
                  <View style={styles.statRow}>
                    <Text variant="caption" color="secondary">
                      Breaths
                    </Text>
                    <Text variant="caption" style={{ color: colors.info }}>
                      {breathCount}
                    </Text>
                  </View>
                )}
                {isNativeMobile &&
                  vitals?.heartRate !== null &&
                  vitals?.heartRate !== undefined && (
                    <View style={styles.statRow}>
                      <Text variant="caption" color="secondary">
                        HR
                      </Text>
                      <Text variant="caption" style={{ color: colors.error }}>
                        {vitals.heartRate} bpm
                      </Text>
                    </View>
                  )}
              </View>
            </View>

            <View style={styles.statusContainer}>
              <View style={styles.statusIndicator}>
                <Ionicons
                  name={micDetected ? 'checkmark-circle' : 'mic-outline'}
                  size={18}
                  color={micDetected ? colors.success : colors.gray[400]}
                />
                <Text variant="caption" color={micDetected ? 'primary' : 'muted'}>
                  {micDetected ? 'Mic ready' : 'Mic...'}
                </Text>
              </View>
              {isNativeMobile && (
                <View style={styles.statusIndicator}>
                  <Ionicons
                    name={hrDetected ? 'checkmark-circle' : 'heart-outline'}
                    size={18}
                    color={hrDetected ? colors.success : colors.gray[400]}
                  />
                  <Text variant="caption" color={hrDetected ? 'primary' : 'muted'}>
                    {hrDetected
                      ? `HR: ${vitals?.heartRate ?? '--'}`
                      : hcStatus?.permissionsGranted
                        ? 'HR...'
                        : 'No permission'}
                  </Text>
                </View>
              )}
            </View>

            {Platform.OS !== 'web' && (
              <View style={styles.audioSourceIndicator}>
                <Ionicons
                  name={audioSource === 'bluetooth' ? 'bluetooth' : 'mic'}
                  size={16}
                  color={audioSource === 'bluetooth' ? colors.primary[400] : colors.gray[400]}
                />
                <Text variant="caption" color={audioSource === 'bluetooth' ? 'primary' : 'muted'}>
                  {audioSource === 'bluetooth'
                    ? `Bluetooth: ${bluetoothDeviceName ?? 'Connected'}`
                    : 'Phone Microphone'}
                </Text>
              </View>
            )}

            {isNativeMobile && !hcStatus?.permissionsGranted && (
              <Pressable style={styles.permissionButton} onPress={requestPermissions}>
                <Ionicons name="key-outline" size={16} color={colors.primary[400]} />
                <Text variant="caption" color="primary">
                  Grant Health Permissions
                </Text>
              </Pressable>
            )}

            <Text variant="caption" color="muted" align="center" style={styles.hint}>
              {!sensorReady
                ? isNativeMobile
                  ? 'Waiting for microphone or heart rate signal...'
                  : 'Waiting for microphone signal...'
                : 'Sensors ready! You can start sleep tracking.'}
            </Text>

            <View style={styles.buttonRow}>
              {sensorReady && (
                <Button variant="primary" onPress={handleComplete}>
                  Start Sleep Tracking
                </Button>
              )}
              <Button variant="outline" onPress={handleSkip}>
                {sensorReady ? 'Cancel' : 'Skip Calibration'}
              </Button>
            </View>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorCircle}>
              <Ionicons name="alert" size={48} color={colors.error} />
            </View>
            <Text variant="h4" weight="semibold" color="primary" align="center">
              Calibration Failed
            </Text>
            {errorMessage && (
              <Text variant="body" color="secondary" align="center" style={styles.errorMessage}>
                {errorMessage}
              </Text>
            )}
            <View style={styles.buttonRow}>
              <Button variant="primary" onPress={startCalibration}>
                Try Again
              </Button>
              {onSkip && (
                <Button variant="outline" onPress={handleSkip}>
                  Skip for now
                </Button>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  testSection: {
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 280,
    justifyContent: 'center',
  },
  instructions: {
    maxWidth: 300,
    marginBottom: spacing.md,
  },
  testButton: {
    minWidth: 180,
  },
  visualizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  levelSection: {
    alignItems: 'center',
    width: 60,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  levelBarContainer: {
    width: 30,
    height: 84,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  levelBar: {
    width: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.sm,
  },
  breathSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  breathPulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  breathTimerContainer: {
    position: 'absolute',
    bottom: -20,
    alignItems: 'center',
  },
  stageCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[900],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gray[700],
  },
  statsSection: {
    width: 80,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.md,
  },
  audioSourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.md,
  },
  hint: {
    maxWidth: 280,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  errorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorMessage: {
    maxWidth: 300,
  },
});
