import { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';

interface DarkScreenOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

function isCurrentlyFullscreen(): boolean {
  if (Platform.OS !== 'web') return false;

  const doc = document as FullscreenDoc;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

function requestFullscreen(): void {
  if (Platform.OS !== 'web') return;

  if (isCurrentlyFullscreen()) return;

  const docEl = document.documentElement as FullscreenElement;

  if (docEl.requestFullscreen) {
    docEl.requestFullscreen().catch(() => {});
  } else if (docEl.webkitRequestFullscreen) {
    docEl.webkitRequestFullscreen().catch(() => {});
  } else if (docEl.mozRequestFullScreen) {
    docEl.mozRequestFullScreen().catch(() => {});
  } else if (docEl.msRequestFullscreen) {
    docEl.msRequestFullscreen().catch(() => {});
  }
}

function exitFullscreen(): void {
  if (Platform.OS !== 'web') return;

  if (!isCurrentlyFullscreen()) return;

  const doc = document as FullscreenDoc;

  if (doc.exitFullscreen) {
    doc.exitFullscreen().catch(() => {});
  } else if (doc.webkitExitFullscreen) {
    doc.webkitExitFullscreen().catch(() => {});
  } else if (doc.mozCancelFullScreen) {
    doc.mozCancelFullScreen().catch(() => {});
  } else if (doc.msExitFullscreen) {
    doc.msExitFullscreen().catch(() => {});
  }
}

export function DarkScreenOverlay({ visible, onDismiss }: DarkScreenOverlayProps) {
  const opacity = useSharedValue(0);
  const wasFullscreenBefore = useRef(false);

  useEffect(() => {
    if (visible) {
      // Remember fullscreen state before we entered dark mode
      wasFullscreenBefore.current = isCurrentlyFullscreen();
      requestFullscreen();
    }
    opacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
  }, [visible]);

  const handleDismiss = useCallback(() => {
    // Only exit fullscreen if we weren't in fullscreen before dark mode
    if (!wasFullscreenBefore.current) {
      exitFullscreen();
    }
    onDismiss();
  }, [onDismiss]);

  const handlePress = () => {
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(handleDismiss)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: opacity.value > 0 ? 'auto' : 'none',
  }));

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.overlay, animatedStyle]}>
      <Pressable style={styles.pressable} onPress={handlePress}>
        <Text variant="caption" style={styles.hint}>
          Tap to wake screen
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 99999,
    elevation: 99999,
    ...Platform.select({
      web: {
        position: 'fixed' as unknown as 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  pressable: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 60,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.1)',
  },
});
