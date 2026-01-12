import { useEffect, useRef, useState, memo } from 'react';
import { View, Animated, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import { Text, TextProps } from './Text';

interface MarqueeTextProps extends Omit<TextProps, 'children'> {
  children: string;
  speed?: number;
  pauseDuration?: number;
  containerStyle?: object;
}

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
  const [measured, setMeasured] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const shouldAnimate = measured && textWidth > containerWidth && containerWidth > 0;
  const overflow = Math.max(0, textWidth - containerWidth);

  useEffect(() => {
    if (!shouldAnimate || overflow <= 0) {
      translateX.setValue(0);
      return;
    }

    const duration = (overflow / speed) * 1000;

    const animate = () => {
      animationRef.current = Animated.sequence([
        Animated.delay(pauseDuration),
        Animated.timing(translateX, {
          toValue: -overflow,
          duration,
          useNativeDriver: true,
        }),
        Animated.delay(pauseDuration),
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
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const handleTextLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) {
      setTextWidth(width);
      setMeasured(true);
    }
  };

  return (
    <View style={[styles.container, containerStyle]} onLayout={handleContainerLayout}>
      <Animated.View style={[styles.textWrapper, shouldAnimate && { transform: [{ translateX }] }]}>
        <Text {...textProps} style={[style, styles.text]} numberOfLines={1}>
          {children}
        </Text>
      </Animated.View>
      {Platform.OS !== 'web' && !measured && (
        <View style={styles.measureContainer} pointerEvents="none">
          <Text
            {...textProps}
            style={[style, styles.measureText]}
            numberOfLines={1}
            onLayout={handleTextLayout}
          >
            {children}
          </Text>
        </View>
      )}
      {Platform.OS === 'web' && (
        <Text
          {...textProps}
          style={[style, styles.hiddenText]}
          numberOfLines={1}
          onLayout={handleTextLayout}
        >
          {children}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flexDirection: 'row',
  },
  textWrapper: {
    flexDirection: 'row',
  },
  text: {
    flexShrink: 0,
  },
  measureContainer: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
  },
  measureText: {
    flexShrink: 0,
  },
  hiddenText: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
  },
});
