import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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

interface MicrophoneTestProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type TestStatus = 'idle' | 'requesting' | 'testing' | 'success' | 'error';

export function MicrophoneTest({ onComplete, onSkip }: MicrophoneTestProps) {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [breathingData, setBreathingData] = useState<BreathingAnalysis | null>(null);
  const [testDuration, setTestDuration] = useState(0);
  const [micConfirmedWorking, setMicConfirmedWorking] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('phone');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(null);
  const [agcGain, setAgcGain] = useState(1.0);

  const { vitals, status: hcStatus, refreshVitals, platform } = useHealth();
  const isNativeMobile = platform === 'ios' || platform === 'android';

  const unsubscribeBreathingRef = useRef<(() => void) | null>(null);
  const unsubscribeAudioRef = useRef<(() => void) | null>(null);
  const testStartTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const levelHeight = useSharedValue(4);
  const stageScale = useSharedValue(1);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (status === 'testing' && isNativeMobile && hcStatus?.permissionsGranted) {
      const interval = setInterval(() => {
        refreshVitals();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, isNativeMobile, hcStatus?.permissionsGranted, refreshVitals]);

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

  const startTest = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage(null);
    setBreathingData(null);
    setTestDuration(0);

    try {
      const success = await startCalibrationTest();

      if (!success) {
        setStatus('error');
        if (Platform.OS === 'web') {
          setErrorMessage('Could not access microphone. Please check your browser settings.');
        } else {
          setErrorMessage(
            'Microphone access not available. Please ensure the app has microphone permission in your device settings.'
          );
        }
        return;
      }

      setStatus('testing');
      testStartTimeRef.current = Date.now();

      if (Platform.OS !== 'web') {
        setAudioSource(getCurrentAudioSource());
        const btInfo = await checkBluetoothAvailability();
        if (btInfo.headsetConnected) {
          setBluetoothDeviceName(btInfo.deviceName);
        }
      }

      timerRef.current = setInterval(() => {
        setTestDuration(Math.floor((Date.now() - testStartTimeRef.current) / 1000));
      }, 1000);

      unsubscribeAudioRef.current = onRawAudioLevel((rms) => {
        const normalized = Math.min(rms * 10, 1);
        setAudioLevel(normalized);
        levelHeight.value = withSpring(4 + normalized * 80, { damping: 15, stiffness: 150 });

        const agcStatus = getAGCStatus();
        setAgcGain(agcStatus.currentGain);
      });

      unsubscribeBreathingRef.current = onBreathingAnalysis((analysis) => {
        setBreathingData(analysis);

        if (analysis.isBreathingDetected && !micConfirmedWorking) {
          setMicConfirmedWorking(true);
        }

        if (analysis.isBreathingDetected) {
          stageScale.value = withTiming(1.08, { duration: 500 }, () => {
            stageScale.value = withTiming(1, { duration: 500 });
          });
        }
      });
    } catch (err) {
      console.warn('Microphone access error:', err);
      setStatus('error');

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setErrorMessage(
            'Microphone access denied. Please allow microphone access in your device settings.'
          );
        } else if (err.name === 'NotFoundError') {
          setErrorMessage('No microphone found. Please connect a microphone and try again.');
        } else {
          setErrorMessage('Could not access microphone. Please check your device settings.');
        }
      } else {
        if (Platform.OS === 'web') {
          setErrorMessage('An unexpected error occurred. Please try again.');
        } else {
          setErrorMessage(
            'Microphone feature requires native audio permissions. Please check app permissions in device settings.'
          );
        }
      }
    }
  }, [levelHeight, stageScale, micConfirmedWorking]);

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

  const isBreathingDetected = breathingData?.isBreathingDetected ?? false;
  const estimatedStage = breathingData?.estimatedStage ?? 'awake';
  const regularity = breathingData?.regularity ?? 0;
  const confidence = breathingData?.confidenceScore ?? 0;
  const stageColor = getSleepStageColor(estimatedStage);
  const stageName = getSleepStageDisplayName(estimatedStage);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic" size={48} color={colors.primary[400]} />
        <Text variant="h3" weight="bold" color="primary" style={styles.title}>
          Breathing Calibration
        </Text>
        <Text variant="body" color="secondary" align="center" style={styles.description}>
          We'll test your microphone and breathing detection to ensure accurate sleep tracking.
        </Text>
      </View>

      <View style={styles.testSection}>
        {status === 'idle' && (
          <>
            <View style={styles.instructions}>
              <Text variant="bodySmall" color="muted" align="center">
                Find a quiet spot and breathe normally. The test will detect your breathing pattern
                through the microphone.
              </Text>
            </View>
            <Button variant="primary" onPress={startTest} style={styles.testButton}>
              Start Calibration
            </Button>
          </>
        )}

        {status === 'requesting' && (
          <>
            <Ionicons name="hourglass-outline" size={64} color={colors.gray[400]} />
            <Text variant="body" color="secondary" align="center">
              Requesting microphone access...
            </Text>
            <Text variant="caption" color="muted" align="center">
              Please allow access when prompted
            </Text>
          </>
        )}

        {status === 'testing' && (
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

              <Animated.View style={[styles.stageCircle, stageStyle]}>
                <View
                  style={[
                    styles.stageInner,
                    { borderColor: micConfirmedWorking ? stageColor : colors.gray[700] },
                  ]}
                >
                  <Text
                    variant="body"
                    weight="bold"
                    style={{
                      color: micConfirmedWorking ? stageColor : colors.gray[500],
                    }}
                  >
                    {micConfirmedWorking ? stageName : 'Waiting...'}
                  </Text>
                  <Text variant="caption" color={micConfirmedWorking ? 'secondary' : 'muted'}>
                    {micConfirmedWorking ? 'Est. Stage' : 'for signal'}
                  </Text>
                </View>
              </Animated.View>

              <View style={styles.statsSection}>
                <Text variant="caption" color="muted" style={styles.sectionLabel}>
                  Quality
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
                {isNativeMobile && hcStatus?.permissionsGranted && vitals && (
                  <>
                    {vitals.heartRate !== null && (
                      <View style={styles.statRow}>
                        <Text variant="caption" color="secondary">
                          HR
                        </Text>
                        <Text variant="caption" style={{ color: colors.error }}>
                          {vitals.heartRate} bpm
                        </Text>
                      </View>
                    )}
                    {vitals.hrv !== null && (
                      <View style={styles.statRow}>
                        <Text variant="caption" color="secondary">
                          HRV
                        </Text>
                        <Text variant="caption" style={{ color: colors.success }}>
                          {vitals.hrv} ms
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>

            <View style={styles.statusIndicator}>
              {micConfirmedWorking ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text variant="body" color="primary">
                    Microphone working!
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="search" size={20} color={colors.gray[400]} />
                  <Text variant="body" color="secondary">
                    Listening... ({testDuration}s)
                  </Text>
                </>
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

            <Text variant="caption" color="muted" align="center" style={styles.hint}>
              {micConfirmedWorking
                ? 'Breathe naturally and watch the estimated sleep stage update.'
                : audioLevel < 0.05
                  ? 'No audio detected. Check your microphone is not muted.'
                  : 'Breathe slowly and steadily near your device.'}
            </Text>

            <View style={styles.buttonRow}>
              {micConfirmedWorking && (
                <Button variant="primary" onPress={handleComplete}>
                  Continue
                </Button>
              )}
              <Button variant="outline" onPress={handleSkip}>
                {micConfirmedWorking ? 'Skip' : 'Skip Test'}
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
              Microphone Issue
            </Text>
            {errorMessage && (
              <Text variant="body" color="secondary" align="center" style={styles.errorMessage}>
                {errorMessage}
              </Text>
            )}
            <View style={styles.buttonRow}>
              <Button variant="primary" onPress={startTest}>
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
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
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
