import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useWearable } from '@/hooks/useWearable';
import { getDeviceTypeName, getDeviceTypeIcon } from '@/services/wearable';
import { colors, spacing, borderRadius, touchTargetMinSize } from '@/theme/tokens';

interface WearableStatusProps {
  onPressConnect?: () => void;
  compact?: boolean;
}

export function WearableStatus({ onPressConnect, compact = false }: WearableStatusProps) {
  const { connectedDevice, isLoading, isConnecting } = useWearable();

  if (isLoading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  if (connectedDevice) {
    const iconName = getDeviceTypeIcon(connectedDevice.device_type) as keyof typeof Ionicons.glyphMap;
    const deviceName = connectedDevice.device_name || getDeviceTypeName(connectedDevice.device_type);

    return (
      <View style={[styles.container, compact && styles.containerCompact, styles.connected]}>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={compact ? 16 : 20} color={colors.success} />
        </View>
        {!compact && (
          <View style={styles.textContainer}>
            <Text variant="bodySmall" weight="medium" style={styles.connectedText}>
              {deviceName}
            </Text>
            <Text variant="caption" color="secondary">
              Connected
            </Text>
          </View>
        )}
        <View style={styles.statusDot} />
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.container, compact && styles.containerCompact, styles.disconnected]}
      onPress={onPressConnect}
      disabled={isConnecting}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="bluetooth-outline"
          size={compact ? 16 : 20}
          color={colors.gray[400]}
        />
      </View>
      {!compact && (
        <Text variant="bodySmall" color="secondary">
          No device connected
        </Text>
      )}
      {isConnecting && (
        <ActivityIndicator size="small" color={colors.primary[500]} style={styles.connectingIndicator} />
      )}
    </Pressable>
  );
}

interface WearableStatusBadgeProps {
  showLabel?: boolean;
}

export function WearableStatusBadge({ showLabel = true }: WearableStatusBadgeProps) {
  const { connectedDevice, isLoading } = useWearable();

  if (isLoading) {
    return null;
  }

  const isConnected = !!connectedDevice;

  return (
    <View style={[styles.badge, isConnected ? styles.badgeConnected : styles.badgeDisconnected]}>
      <Ionicons
        name={isConnected ? 'bluetooth' : 'bluetooth-outline'}
        size={12}
        color={isConnected ? colors.success : colors.gray[400]}
      />
      {showLabel && (
        <Text
          variant="caption"
          style={[styles.badgeText, isConnected ? styles.badgeTextConnected : styles.badgeTextDisconnected]}
        >
          {isConnected ? 'Connected' : 'No Device'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minHeight: touchTargetMinSize,
  },
  containerCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  connected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  disconnected: {
    backgroundColor: colors.gray[800],
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  connectedText: {
    color: colors.success,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  connectingIndicator: {
    marginLeft: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  badgeConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgeDisconnected: {
    backgroundColor: colors.gray[800],
  },
  badgeText: {
    fontSize: 10,
  },
  badgeTextConnected: {
    color: colors.success,
  },
  badgeTextDisconnected: {
    color: colors.gray[400],
  },
});
