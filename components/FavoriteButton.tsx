import { useCallback } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useFavoritesContext } from '@/components/FavoritesProvider';
import { useThemedAlert } from '@/components/ui/ThemedAlert';
import { colors, touchTargetMinSize } from '@/theme/tokens';

interface FavoriteButtonProps {
  dreamId: string;
  size?: number;
  showBackground?: boolean;
}

export function FavoriteButton({
  dreamId,
  size = 24,
  showBackground = false,
}: FavoriteButtonProps) {
  const { isFavorited: checkFavorited, isLoading, toggleFavorite } = useFavoritesContext();
  const { showAlert } = useThemedAlert();
  const isFavorited = checkFavorited(dreamId);
  const toggle = useCallback(() => toggleFavorite(dreamId), [toggleFavorite, dreamId]);
  const scale = useSharedValue(1);

  const handlePress = useCallback(async () => {
    scale.value = withSpring(1.3, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });

    try {
      await toggle();
    } catch {
      showAlert('Error', 'Failed to update favorite. Please try again.');
    }
  }, [toggle, scale, showAlert]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (isLoading) {
    return (
      <Pressable style={[styles.button, showBackground && styles.buttonWithBackground]} disabled>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.button, showBackground && styles.buttonWithBackground]}
      onPress={handlePress}
      hitSlop={8}
      accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={isFavorited ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorited ? colors.error : colors.gray[400]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: touchTargetMinSize,
    minHeight: touchTargetMinSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWithBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: touchTargetMinSize / 2,
  },
});
