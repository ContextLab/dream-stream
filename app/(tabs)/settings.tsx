import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { SleepDebugPanel } from '@/components/SleepDebugPanel';
import { VolumeSetup } from '@/components/VolumeSetup';
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const [showSleepDebug, setShowSleepDebug] = useState(false);
  const [showVolumeSetup, setShowVolumeSetup] = useState(false);
  const [showHealthConnect, setShowHealthConnect] = useState(false);

  const {
    isAndroid,
    isAvailable,
    status,
    isLoading,
    error,
    vitals,
    initialize,
    requestPermissions,
    testConnection,
    isTestRunning,
    testResult,
    supportedDevices,
    openSettings,
  } = useHealthConnect();

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
            label="Volume & Audio"
            onPress={() => setShowVolumeSetup(true)}
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

        <View style={styles.wearableSection}>
          <MenuRow
            icon="watch-outline"
            label="Wearable / Health Connect"
            onPress={() => setShowHealthConnect(!showHealthConnect)}
            badge={!isAndroid ? 'Android Only' : undefined}
          />
          {showHealthConnect && (
            <View style={styles.expandedSection}>
              {!isAndroid ? (
                <Text variant="caption" color="muted" style={styles.platformNote}>
                  Health Connect is only available on Android devices. iOS support via HealthKit
                  coming soon.
                </Text>
              ) : (
                <>
                  <View style={styles.statusRow}>
                    <Text variant="caption" color="muted">
                      Status:
                    </Text>
                    <Text variant="caption" color={isAvailable ? 'success' : 'muted'}>
                      {isLoading
                        ? 'Checking...'
                        : status?.sdkStatus === 'available'
                          ? 'Available'
                          : 'Not Available'}
                    </Text>
                  </View>

                  {error && (
                    <Text variant="caption" color="error" style={styles.errorText}>
                      {error}
                    </Text>
                  )}

                  {!status?.initialized && (
                    <Pressable
                      style={styles.actionButton}
                      onPress={async () => {
                        await initialize();
                        await requestPermissions();
                      }}
                    >
                      <Ionicons name="link-outline" size={18} color={colors.primary[400]} />
                      <Text variant="body" color="primary" style={styles.actionButtonText}>
                        Connect Health Connect
                      </Text>
                    </Pressable>
                  )}

                  {status?.initialized && (
                    <>
                      {vitals && (
                        <View style={styles.vitalsContainer}>
                          <View style={styles.vitalItem}>
                            <Ionicons name="heart-outline" size={20} color={colors.primary[400]} />
                            <Text variant="body" color="primary">
                              {vitals.heartRate ? `${vitals.heartRate} bpm` : '--'}
                            </Text>
                          </View>
                          <View style={styles.vitalItem}>
                            <Ionicons name="pulse-outline" size={20} color={colors.primary[400]} />
                            <Text variant="body" color="primary">
                              {vitals.hrv ? `${vitals.hrv.toFixed(0)} ms HRV` : '--'}
                            </Text>
                          </View>
                        </View>
                      )}

                      <Pressable
                        style={styles.actionButton}
                        onPress={testConnection}
                        disabled={isTestRunning}
                      >
                        {isTestRunning ? (
                          <ActivityIndicator size="small" color={colors.primary[400]} />
                        ) : (
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={18}
                            color={colors.primary[400]}
                          />
                        )}
                        <Text variant="body" color="primary" style={styles.actionButtonText}>
                          {isTestRunning ? 'Testing...' : 'Test Connection'}
                        </Text>
                      </Pressable>

                      {testResult && (
                        <View style={styles.testResults}>
                          {testResult.steps.map((step, index) => (
                            <View key={index} style={styles.testStep}>
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
                                  <Text
                                    variant="caption"
                                    color="muted"
                                    style={styles.testStepDetail}
                                  >
                                    {step.detail}
                                  </Text>
                                )}
                                {step.error && !step.passed && (
                                  <Text
                                    variant="caption"
                                    color="error"
                                    style={styles.testStepDetail}
                                  >
                                    {step.error}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                          {!testResult.success && (
                            <Pressable style={styles.actionButton} onPress={openSettings}>
                              <Ionicons
                                name="settings-outline"
                                size={18}
                                color={colors.primary[400]}
                              />
                              <Text variant="body" color="primary" style={styles.actionButtonText}>
                                Open Health Connect Settings
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.deviceList}>
                    <Text variant="caption" color="muted" style={styles.deviceListTitle}>
                      Supported Devices:
                    </Text>
                    {supportedDevices.slice(0, 4).map((device, index) => (
                      <Text key={index} variant="caption" color="muted" style={styles.deviceItem}>
                        • {device.name}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </View>

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
