import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useThemedAlert } from '@/components/ui/ThemedAlert';
import { SleepModePlayer } from '@/components/SleepModePlayer';
import { useLaunchQueue } from '@/hooks/useLaunchQueue';
import { useSleepTracking } from '@/hooks/useSleepTracking';
import { colors, spacing } from '@/theme/tokens';

export default function DreamLaunchScreen() {
  const router = useRouter();
  const { showAlert } = useThemedAlert();
  const { activeItem, complete, cancel, refresh } = useLaunchQueue();
  const { isTracking, currentStage } = useSleepTracking();
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleComplete = useCallback(async () => {
    if (!activeItem) return;

    try {
      await complete(activeItem.id);
      showAlert('Dream Complete', 'Your dream session has ended.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch {
      showAlert('Error', 'Failed to mark dream as complete');
    }
  }, [activeItem, complete, router]);

  const handleStop = useCallback(async () => {
    if (!activeItem) return;

    showAlert('Stop Dream', 'Are you sure you want to stop this dream?', [
      { text: 'Continue', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancel(activeItem.id);
            router.replace('/(tabs)');
          } catch {
            showAlert('Error', 'Failed to stop dream');
          }
        },
      },
    ]);
  }, [activeItem, cancel, router]);

  if (!activeItem) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centeredContent}>
          <Text variant="h4" color="primary" align="center">
            No dream ready
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.noItemMessage}>
            Queue a dream and mark it as ready to launch it here
          </Text>
          <Button variant="primary" onPress={() => router.replace('/(tabs)')}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" hidden />

      <View style={styles.header}>
        {isTracking && (
          <View style={styles.trackingBadge}>
            <View style={styles.trackingDot} />
            <Text variant="caption" style={styles.trackingText}>
              Sleep tracking active
            </Text>
          </View>
        )}
      </View>

      <View style={styles.playerContainer}>
        <SleepModePlayer
          dream={activeItem.dream}
          onComplete={handleComplete}
          onStop={handleStop}
          enableHaptics={true}
        />
      </View>

      <View style={styles.footer}>
        <Button variant="ghost" onPress={handleStop}>
          <Text variant="body" color="secondary">
            Stop Dream
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[950],
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  noItemMessage: {
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  header: {
    padding: spacing.md,
    alignItems: 'center',
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  trackingText: {
    color: colors.success,
  },
  playerContainer: {
    flex: 1,
  },
  footer: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
