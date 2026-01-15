import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { SleepDebugPanel } from '@/components/SleepDebugPanel';
import { VolumeSetup } from '@/components/VolumeSetup';
import { MicrophoneTest } from '@/components/MicrophoneTest';
import { useHealth } from '@/hooks/useHealth';
import { colors, spacing, fontFamily } from '@/theme/tokens';
import {
  runDebugReport,
  formatDebugReport,
  learnFromRecentNights,
  clearModel,
  type DebugReport,
} from '@/services/sleepStageLearning';
import {
  runHealthConnectDebugReport,
  formatHealthConnectDebugReport,
} from '@/services/healthConnect';
import {
  trainRemOptimizedModel,
  loadRemOptimizedModel,
  clearRemOptimizedModel,
  formatTrainingReport,
  exportTrainingData,
  formatExportedData,
  dumpRawDataToConsole,
  type TrainingProgressCallback,
} from '@/services/remOptimizedClassifier';

export default function SettingsScreen() {
  const [showSleepDebug, setShowSleepDebug] = useState(false);
  const [showVolumeSetup, setShowVolumeSetup] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  const [showWearable, setShowWearable] = useState(false);
  const [showModelDebug, setShowModelDebug] = useState(false);
  const [modelDebugReport, setModelDebugReport] = useState<string | null>(null);
  const [isLoadingModelDebug, setIsLoadingModelDebug] = useState(false);
  const [showHCDebug, setShowHCDebug] = useState(false);
  const [hcDebugReport, setHcDebugReport] = useState<string | null>(null);
  const [isLoadingHCDebug, setIsLoadingHCDebug] = useState(false);
  const [showRemOptimized, setShowRemOptimized] = useState(false);
  const [remOptimizedReport, setRemOptimizedReport] = useState<string | null>(null);
  const [isTrainingRemOptimized, setIsTrainingRemOptimized] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState<{
    message: string;
    percent: number;
  } | null>(null);

  const health = useHealth();

  const handleRunModelDebug = async () => {
    setIsLoadingModelDebug(true);
    setModelDebugReport(null);
    try {
      const report = await runDebugReport(48);
      setModelDebugReport(formatDebugReport(report));
    } catch (error) {
      setModelDebugReport(`Error: ${error}`);
    } finally {
      setIsLoadingModelDebug(false);
    }
  };

  const handleRetrainModel = async () => {
    setIsLoadingModelDebug(true);
    try {
      await learnFromRecentNights(48);
      await handleRunModelDebug();
    } catch (error) {
      setModelDebugReport(`Retrain error: ${error}`);
      setIsLoadingModelDebug(false);
    }
  };

  const handleClearModel = async () => {
    await clearModel();
    setModelDebugReport('Model cleared. Tap "Run Debug Report" to see current state.');
  };

  const handleRunHCDebug = async () => {
    setIsLoadingHCDebug(true);
    setHcDebugReport(null);
    try {
      const report = await runHealthConnectDebugReport(24);
      setHcDebugReport(formatHealthConnectDebugReport(report));
    } catch (error) {
      setHcDebugReport(`Error: ${error}`);
    } finally {
      setIsLoadingHCDebug(false);
    }
  };

  const handleTrainRemOptimized = async () => {
    setIsTrainingRemOptimized(true);
    setTrainingProgress({ message: 'Initializing...', percent: 0 });
    setRemOptimizedReport(null);
    try {
      const onProgress: TrainingProgressCallback = (progress) => {
        setTrainingProgress({ message: progress.message, percent: progress.percent });
      };
      const { model, report } = await trainRemOptimizedModel(720, onProgress);
      setRemOptimizedReport(formatTrainingReport(report));
    } catch (error) {
      setRemOptimizedReport(`Training failed: ${error}`);
    } finally {
      setIsTrainingRemOptimized(false);
      setTrainingProgress(null);
    }
  };

  const handleAnalyzeData = async () => {
    setIsTrainingRemOptimized(true);
    setRemOptimizedReport('Analyzing training data...');
    try {
      const data = await exportTrainingData(720);
      setRemOptimizedReport(formatExportedData(data));
    } catch (error) {
      setRemOptimizedReport(`Analysis failed: ${error}`);
    } finally {
      setIsTrainingRemOptimized(false);
    }
  };

  const handleDumpRawData = async () => {
    setIsTrainingRemOptimized(true);
    setRemOptimizedReport('Dumping raw data to console (check logcat)...');
    try {
      const result = await dumpRawDataToConsole(720);
      setRemOptimizedReport(result);
    } catch (error) {
      setRemOptimizedReport(`Dump failed: ${error}`);
    } finally {
      setIsTrainingRemOptimized(false);
    }
  };

  const handleLoadRemOptimized = async () => {
    const model = await loadRemOptimizedModel();
    if (model) {
      let status = '╔══════════════════════════════════════════╗\n';
      status += '║   REM-OPTIMIZED MODEL STATUS (3-CLASS)   ║\n';
      status += '╚══════════════════════════════════════════╝\n\n';
      status += `Nights analyzed: ${model.nightsAnalyzed}\n`;
      status += `Last updated: ${new Date(model.lastUpdated).toLocaleString()}\n\n`;

      if (model.validationAccuracy !== null) {
        status += `Overall Accuracy: ${(model.validationAccuracy * 100).toFixed(1)}%\n`;
        status += `REM Sensitivity: ${((model.remSensitivity ?? 0) * 100).toFixed(1)}%\n`;
        status += `REM Specificity: ${((model.remSpecificity ?? 0) * 100).toFixed(1)}%\n\n`;
        status += `Per-Stage Accuracy:\n`;
        status += `  Awake: ${(model.perStageAccuracy.awake * 100).toFixed(1)}%\n`;
        status += `  NREM:  ${(model.perStageAccuracy.nrem * 100).toFixed(1)}%\n`;
        status += `  REM:   ${(model.perStageAccuracy.rem * 100).toFixed(1)}%\n`;
      }

      setRemOptimizedReport(status);
    } else {
      setRemOptimizedReport('No REM-optimized model trained yet.\nTap "Train 3-Class" to begin.');
    }
  };

  const handleClearRemOptimized = async () => {
    await clearRemOptimizedModel();
    setRemOptimizedReport('REM-optimized model cleared.');
  };

  useEffect(() => {
    if (showWearable && health.status?.permissionsGranted) {
      health.startVitalsPolling();
    } else {
      health.stopVitalsPolling();
    }
  }, [showWearable, health.status?.permissionsGranted]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">
            Settings
          </Heading>
        </View>

        <View style={styles.menuSection}>
          <MenuRow
            icon="volume-medium-outline"
            label="Volume Calibration"
            onPress={() => setShowVolumeSetup(true)}
          />
          <MenuRow
            icon="mic-outline"
            label="Microphone Calibration"
            onPress={() => setShowMicTest(true)}
          />
          <Link href={'/about' as any} asChild>
            <Pressable style={styles.menuRow}>
              <Ionicons name="information-circle-outline" size={24} color={colors.gray[400]} />
              <Text variant="body" color="primary" style={styles.menuLabel}>
                About dream_stream
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[500]} />
            </Pressable>
          </Link>
        </View>

        {(Platform.OS === 'android' || Platform.OS === 'ios') && (
          <View style={styles.wearableSection}>
            <MenuRow
              icon="watch-outline"
              label={Platform.OS === 'ios' ? 'Wearables & HealthKit' : 'Wearables & Health Connect'}
              onPress={() => setShowWearable(!showWearable)}
              badge={health.status?.permissionsGranted ? 'Connected' : undefined}
            />
            {showWearable && (
              <View style={styles.expandedSection}>
                {health.platform === 'other' ? (
                  <Text variant="caption" color="muted" style={styles.platformNote}>
                    Health integration is only available on iOS and Android devices.
                  </Text>
                ) : (
                  <>
                    <View style={styles.statusRow}>
                      <Text variant="caption" color="muted">
                        Status:
                      </Text>
                      <Text
                        variant="caption"
                        color={health.status?.available ? 'success' : 'muted'}
                      >
                        {health.status?.available ? 'Available' : 'Not Available'}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Text variant="caption" color="muted">
                        Permissions:
                      </Text>
                      <Text
                        variant="caption"
                        color={health.status?.permissionsGranted ? 'success' : 'muted'}
                      >
                        {health.status?.permissionsGranted ? 'Granted' : 'Not granted'}
                      </Text>
                    </View>

                    {health.error && (
                      <Text variant="caption" color="error" style={styles.errorText}>
                        {health.error}
                      </Text>
                    )}

                    {health.status?.permissionsGranted && (
                      <View style={styles.vitalsContainer}>
                        <View style={styles.vitalItem}>
                          <Ionicons name="heart" size={16} color={colors.primary[500]} />
                          <Text variant="caption" color="primary">
                            {health.vitals?.heartRate ?? '--'} bpm
                          </Text>
                        </View>
                        <View style={styles.pollingIndicator}>
                          {health.isPolling && <View style={styles.pollingDot} />}
                          <Pressable style={styles.refreshButton} onPress={health.refreshVitals}>
                            <Ionicons name="refresh" size={14} color={colors.gray[400]} />
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {!health.status?.permissionsGranted && (
                      <Pressable
                        style={styles.actionButton}
                        onPress={health.requestPermissions}
                        disabled={health.isLoading}
                      >
                        {health.isLoading ? (
                          <ActivityIndicator size="small" color={colors.gray[400]} />
                        ) : (
                          <Ionicons name="key-outline" size={18} color={colors.gray[300]} />
                        )}
                        <Text variant="caption" color="primary" style={styles.actionButtonText}>
                          Request Permissions
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      style={styles.actionButton}
                      onPress={health.testConnection}
                      disabled={health.isTestRunning}
                    >
                      {health.isTestRunning ? (
                        <ActivityIndicator size="small" color={colors.gray[400]} />
                      ) : (
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color={colors.gray[300]}
                        />
                      )}
                      <Text variant="caption" color="primary" style={styles.actionButtonText}>
                        Test Connection
                      </Text>
                    </Pressable>

                    {health.testResult && (
                      <View style={styles.testResults}>
                        {health.testResult.steps.map((step, idx) => (
                          <View key={idx} style={styles.testStep}>
                            <Ionicons
                              name={step.passed ? 'checkmark-circle' : 'close-circle'}
                              size={16}
                              color={step.passed ? colors.success : colors.error}
                            />
                            <View style={styles.testStepContent}>
                              <Text
                                variant="caption"
                                color={step.passed ? 'success' : 'error'}
                                style={styles.testStepText}
                              >
                                {step.name}
                              </Text>
                              {step.detail && (
                                <Text variant="caption" color="muted" style={styles.testStepDetail}>
                                  {step.detail}
                                </Text>
                              )}
                              {step.error && (
                                <Text variant="caption" color="error" style={styles.testStepDetail}>
                                  {step.error}
                                </Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    <Pressable style={styles.actionButton} onPress={health.openSettings}>
                      <Ionicons name="settings-outline" size={18} color={colors.gray[300]} />
                      <Text variant="caption" color="primary" style={styles.actionButtonText}>
                        {Platform.OS === 'ios'
                          ? 'Open Health Settings'
                          : 'Open Health Connect Settings'}
                      </Text>
                    </Pressable>

                    <View style={styles.deviceList}>
                      <Text variant="caption" color="muted" style={styles.deviceListTitle}>
                        Supported Devices:
                      </Text>
                      {health.supportedDevices.slice(0, 3).map((device, idx) => (
                        <Text key={idx} variant="caption" color="muted" style={styles.deviceItem}>
                          • {device.name}
                        </Text>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.debugSection}>
          {Platform.OS === 'web' && (
            <>
              <MenuRow
                icon="pulse-outline"
                label="Test Sleep Detection"
                onPress={() => setShowSleepDebug(!showSleepDebug)}
              />
              {showSleepDebug && <SleepDebugPanel />}
            </>
          )}

          <MenuRow
            icon="analytics-outline"
            label="Wearable Sleep Insights"
            onPress={() => setShowModelDebug(!showModelDebug)}
          />
          {showModelDebug && (
            <View style={styles.expandedSection}>
              <View style={styles.debugButtonRow}>
                <Pressable
                  style={styles.debugButton}
                  onPress={handleRunModelDebug}
                  disabled={isLoadingModelDebug}
                >
                  {isLoadingModelDebug ? (
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                  ) : (
                    <Ionicons name="eye-outline" size={16} color={colors.primary[500]} />
                  )}
                  <Text variant="caption" color="primary">
                    View Analysis
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.debugButton}
                  onPress={handleRetrainModel}
                  disabled={isLoadingModelDebug}
                >
                  <Ionicons name="refresh" size={16} color={colors.accent.cyan} />
                  <Text variant="caption" color="primary">
                    Refresh
                  </Text>
                </Pressable>
                <Pressable style={styles.debugButton} onPress={handleClearModel}>
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text variant="caption" color="primary">
                    Reset
                  </Text>
                </Pressable>
              </View>
              {modelDebugReport && (
                <ScrollView
                  style={styles.debugOutput}
                  horizontal={false}
                  nestedScrollEnabled={true}
                >
                  <Text
                    variant="caption"
                    color="muted"
                    style={styles.debugOutputText}
                    selectable={true}
                  >
                    {modelDebugReport}
                  </Text>
                </ScrollView>
              )}
            </View>
          )}

          {(Platform.OS === 'android' || Platform.OS === 'ios') && (
            <>
              <MenuRow
                icon="moon-outline"
                label="Sleep Stage Classifier"
                onPress={() => {
                  setShowRemOptimized(!showRemOptimized);
                  if (!showRemOptimized && !remOptimizedReport) {
                    handleLoadRemOptimized();
                  }
                }}
              />
              {showRemOptimized && (
                <View style={styles.expandedSection}>
                  <Text variant="caption" color="muted" style={{ marginBottom: spacing.sm }}>
                    Train a personalized REM detector using your wearable sleep data. Uses 90-minute
                    ultradian cycles and HR variability patterns to predict REM windows.
                  </Text>
                  <View style={styles.debugButtonRow}>
                    <Pressable
                      style={styles.debugButton}
                      onPress={handleLoadRemOptimized}
                      disabled={isTrainingRemOptimized}
                    >
                      <Ionicons name="information-circle" size={16} color={colors.primary[500]} />
                      <Text variant="caption" color="primary">
                        Status
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.debugButton, styles.trainButton]}
                      onPress={handleTrainRemOptimized}
                      disabled={isTrainingRemOptimized}
                    >
                      {isTrainingRemOptimized ? (
                        <ActivityIndicator size="small" color={colors.gray[950]} />
                      ) : (
                        <Ionicons name="flash" size={16} color={colors.gray[950]} />
                      )}
                      <Text variant="caption" style={{ color: colors.gray[950] }}>
                        Train
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.debugButton}
                      onPress={handleAnalyzeData}
                      disabled={isTrainingRemOptimized}
                    >
                      <Ionicons name="analytics-outline" size={16} color={colors.accent.cyan} />
                      <Text variant="caption" color="primary">
                        Analyze
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.debugButton}
                      onPress={handleClearRemOptimized}
                      disabled={isTrainingRemOptimized}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text variant="caption" color="primary">
                        Clear
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.debugButton}
                      onPress={handleDumpRawData}
                      disabled={isTrainingRemOptimized}
                    >
                      <Ionicons name="download-outline" size={16} color={colors.accent.purple} />
                      <Text variant="caption" color="primary">
                        Dump
                      </Text>
                    </Pressable>
                  </View>
                  {trainingProgress && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${trainingProgress.percent}%` },
                          ]}
                        />
                      </View>
                      <Text variant="caption" color="muted" style={styles.progressText}>
                        {trainingProgress.message} ({trainingProgress.percent}%)
                      </Text>
                    </View>
                  )}
                  {remOptimizedReport && (
                    <ScrollView
                      style={styles.debugOutput}
                      horizontal={false}
                      nestedScrollEnabled={true}
                    >
                      <Text
                        variant="caption"
                        color="muted"
                        style={styles.debugOutputText}
                        selectable={true}
                      >
                        {remOptimizedReport}
                      </Text>
                    </ScrollView>
                  )}
                </View>
              )}

              <MenuRow
                icon="heart-outline"
                label="View Health Data"
                onPress={() => setShowHCDebug(!showHCDebug)}
              />
              {showHCDebug && (
                <View style={styles.expandedSection}>
                  <Text variant="caption" color="muted" style={{ marginBottom: spacing.sm }}>
                    Recent health data from your wearable (last 24 hours)
                  </Text>
                  <View style={styles.debugButtonRow}>
                    <Pressable
                      style={styles.debugButton}
                      onPress={handleRunHCDebug}
                      disabled={isLoadingHCDebug}
                    >
                      {isLoadingHCDebug ? (
                        <ActivityIndicator size="small" color={colors.primary[500]} />
                      ) : (
                        <Ionicons name="refresh-outline" size={16} color={colors.primary[500]} />
                      )}
                      <Text variant="caption" color="primary">
                        Load Data
                      </Text>
                    </Pressable>
                  </View>
                  {hcDebugReport && (
                    <ScrollView
                      style={styles.debugOutput}
                      horizontal={false}
                      nestedScrollEnabled={true}
                    >
                      <Text
                        variant="caption"
                        color="muted"
                        style={styles.debugOutputText}
                        selectable={true}
                      >
                        {hcDebugReport}
                      </Text>
                    </ScrollView>
                  )}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.versionSection}>
          <Text variant="caption" color="muted">
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showVolumeSetup}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVolumeSetup(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowVolumeSetup(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[400]} />
            </Pressable>
          </View>
          <VolumeSetup
            onComplete={() => setShowVolumeSetup(false)}
            onSkip={() => setShowVolumeSetup(false)}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showMicTest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMicTest(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowMicTest(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[400]} />
            </Pressable>
          </View>
          <MicrophoneTest
            onComplete={() => setShowMicTest(false)}
            onSkip={() => setShowMicTest(false)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

interface MenuRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  badge?: string;
}

function MenuRow({ icon, label, onPress, badge }: MenuRowProps) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={24} color={colors.gray[400]} />
      <Text variant="body" color="primary" style={styles.menuLabel}>
        {label}
      </Text>
      {badge && (
        <View style={styles.badge}>
          <Text variant="caption" color="muted">
            {badge}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.gray[500]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[950],
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  menuSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuLabel: {
    flex: 1,
    marginLeft: spacing.md,
  },
  badge: {
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  versionSection: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  wearableSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  debugSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[800],
  },
  expandedSection: {
    paddingVertical: spacing.md,
    paddingLeft: spacing.xl + spacing.md,
  },
  platformNote: {
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  errorText: {
    marginBottom: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[800],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginVertical: spacing.sm,
  },
  actionButtonText: {
    marginLeft: spacing.sm,
  },
  vitalsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginVertical: spacing.sm,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: spacing.xs,
  },
  pollingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  testResults: {
    marginTop: spacing.sm,
  },
  testStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  testStepContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  testStepText: {
    marginLeft: 0,
  },
  testStepDetail: {
    marginTop: 2,
    lineHeight: 16,
  },
  deviceList: {
    marginTop: spacing.md,
  },
  deviceListTitle: {
    marginBottom: spacing.xs,
  },
  deviceItem: {
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.gray[950],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  closeButton: {
    padding: spacing.sm,
  },
  debugButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray[800],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  trainButton: {
    backgroundColor: colors.primary[500],
  },
  debugOutput: {
    maxHeight: 400,
    backgroundColor: colors.gray[900],
    borderRadius: 8,
    padding: spacing.sm,
  },
  debugOutputText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.gray[800],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  progressText: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
