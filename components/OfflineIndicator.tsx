import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OfflineIndicatorProps {
  isOffline: boolean;
  message?: string;
}

export function OfflineIndicator({
  isOffline,
  message = 'No internet connection',
}: OfflineIndicatorProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -100, { duration: 300 });
  }, [isOffline, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isOffline && translateY.value === -100) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top }]}>
      <Ionicons name="cloud-offline" size={20} color="#ffffff" />
      <Text variant="bodySmall" color="inherit" style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOnline(navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    return () => {};
  }, []);

  return { isOnline };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 1000,
  },
  text: {
    color: '#ffffff',
    marginLeft: spacing.sm,
  },
});
