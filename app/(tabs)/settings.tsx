import { useState } from 'react';
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
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const [showSleepDebug, setShowSleepDebug] = useState(false);
  const [showVolumeSetup, setShowVolumeSetup] = useState(false);
  const [showMicTest, setShowMicTest] = useState(false);
  const [showWearable, setShowWearable] = useState(false);

  const healthConnect = useHealthConnect();

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

        {Platform.OS === 'android' && (
          <View style={styles.wearableSection}>
            <MenuRow
              icon="watch-outline"
              label="Wearables & Health Connect"
              onPress={() => setShowWearable(!showWearable)}
              badge={healthConnect.status?.permissionsGranted ? 'Connected' : undefined}
            />
            {showWearable && (
              <View style={styles.expandedSection}>
                {!healthConnect.isAndroid ? (
                  <Text variant="caption" color="muted" style={styles.platformNote}>
                    Health Connect is only available on Android devices.
                  </Text>
                ) : (
                  <>
                    <View style={styles.statusRow}>
                      <Text variant="caption" color="muted">
                        SDK Status:
                      </Text>
                      <Text
                        variant="caption"
                        color={
                          healthConnect.status?.sdkStatus === 'available' ? 'success' : 'muted'
                        }
                      >
                        {healthConnect.status?.sdkStatus || 'checking...'}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Text variant="caption" color="muted">
                        Permissions:
                      </Text>
                      <Text
                        variant="caption"
                        color={healthConnect.status?.permissionsGranted ? 'success' : 'muted'}
                      >
                        {healthConnect.status?.permissionsGranted ? 'Granted' : 'Not granted'}
                      </Text>
                    </View>

                    {healthConnect.error && (
                      <Text variant="caption" color="error" style={styles.errorText}>
                        {healthConnect.error}
                      </Text>
                    )}

                    {healthConnect.vitals && (
                      <View style={styles.vitalsContainer}>
                        <View style={styles.vitalItem}>
                          <Ionicons name="heart" size={16} color={colors.primary[500]} />
                          <Text variant="caption" color="primary">
                            {healthConnect.vitals.heartRate ?? '--'} bpm
                          </Text>
                        </View>
                        <View style={styles.vitalItem}>
                          <Ionicons name="pulse" size={16} color={colors.accent.cyan} />
                          <Text variant="caption" color="primary">
                            {healthConnect.vitals.hrv?.toFixed(0) ?? '--'} ms HRV
                          </Text>
                        </View>
                      </View>
                    )}

                    {!healthConnect.status?.permissionsGranted && (
                      <Pressable
                        style={styles.actionButton}
                        onPress={healthConnect.requestPermissions}
                        disabled={healthConnect.isLoading}
                      >
                        {healthConnect.isLoading ? (
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
                      onPress={healthConnect.testConnection}
                      disabled={healthConnect.isTestRunning}
                    >
                      {healthConnect.isTestRunning ? (
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

                    {healthConnect.testResult && (
                      <View style={styles.testResults}>
                        {healthConnect.testResult.steps.map((step, idx) => (
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

                    <Pressable style={styles.actionButton} onPress={healthConnect.openSettings}>
                      <Ionicons name="settings-outline" size={18} color={colors.gray[300]} />
                      <Text variant="caption" color="primary" style={styles.actionButtonText}>
                        Open Health Connect Settings
                      </Text>
                    </Pressable>

                    <View style={styles.deviceList}>
                      <Text variant="caption" color="muted" style={styles.deviceListTitle}>
                        Supported Devices:
                      </Text>
                      {healthConnect.supportedDevices.slice(0, 3).map((device, idx) => (
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
          <MenuRow
            icon="bug-outline"
            label="Sleep Detection Debug"
            onPress={() => setShowSleepDebug(!showSleepDebug)}
          />
          {showSleepDebug && <SleepDebugPanel />}
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
    backgroundColor: '#0f0f1a',
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
    borderTopColor: '#252542',
    borderBottomWidth: 1,
    borderBottomColor: '#252542',
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
    backgroundColor: '#252542',
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
    borderTopColor: '#252542',
  },
  debugSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#252542',
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
    backgroundColor: '#252542',
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
    gap: spacing.lg,
    marginVertical: spacing.sm,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    backgroundColor: '#0f0f1a',
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
});
