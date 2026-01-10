import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shareDreamUrl } from '@/services/share';
import { colors, touchTargetMinSize } from '@/theme/tokens';

interface ShareButtonProps {
  dreamId: string;
  dreamTitle: string;
  size?: number;
  showBackground?: boolean;
}

export function ShareButton({
  dreamId,
  dreamTitle,
  size = 24,
  showBackground = false,
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      await shareDreamUrl(dreamId, dreamTitle);
    } finally {
      setIsSharing(false);
    }
  }, [dreamId, dreamTitle, isSharing]);

  if (isSharing) {
    return (
      <Pressable
        style={[styles.button, showBackground && styles.buttonWithBackground]}
        disabled
      >
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.button, showBackground && styles.buttonWithBackground]}
      onPress={handleShare}
      hitSlop={8}
      accessibilityLabel="Share dream"
    >
      <Ionicons name="share-outline" size={size} color="#ffffff" />
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
