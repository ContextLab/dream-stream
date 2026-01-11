import { useEffect, useRef, useState, memo } from 'react';
import { View, Animated, StyleSheet, LayoutChangeEvent, TextStyle } from 'react-native';
import { Text, TextProps } from './Text';

interface MarqueeTextProps extends Omit<TextProps, 'children'> {
  children: string;
  speed?: number; // pixels per second
  pauseDuration?: number; // ms to pause at each end
  containerStyle?: object;
}

/**
 * MarqueeText - A text component that scrolls horizontally when text overflows.
 *
 * Scrolls left to reveal the end, pauses, then scrolls right back to the start.
 * Only animates if text is wider than container.
 */
export const MarqueeText = memo(function MarqueeText({
  children,
  speed = 30,
  pauseDuration = 1500,
  containerStyle,
  style,
  ...textProps
}: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const shouldAnimate = textWidth > containerWidth && containerWidth > 0;
  const overflow = textWidth - containerWidth;

  useEffect(() => {
    if (!shouldAnimate) {
      translateX.setValue(0);
      return;
    }

    const duration = (overflow / speed) * 1000;

    const animate = () => {
      animationRef.current = Animated.sequence([
        // Pause at start
        Animated.delay(pauseDuration),
        // Scroll left to show end
        Animated.timing(translateX, {
          toValue: -overflow,
          duration,
          useNativeDriver: true,
        }),
        // Pause at end
        Animated.delay(pauseDuration),
        // Scroll right back to start
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]);

      animationRef.current.start(({ finished }) => {
        if (finished) {
          animate();
        }
      });
    };

    animate();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      translateX.setValue(0);
    };
  }, [shouldAnimate, overflow, speed, pauseDuration, translateX]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleTextLayout = (event: LayoutChangeEvent) => {
    setTextWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.container, containerStyle]} onLayout={handleContainerLayout}>
      <Animated.View style={[styles.textWrapper, shouldAnimate && { transform: [{ translateX }] }]}>
        <Text {...textProps} style={style} numberOfLines={1} onLayout={handleTextLayout}>
          {children}
        </Text>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  textWrapper: {
    flexDirection: 'row',
  },
});
