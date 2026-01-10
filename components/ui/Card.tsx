import { View, ViewProps, Pressable, PressableProps } from 'react-native';
import { shadows } from '@/theme/tokens';

interface CardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface PressableCardProps extends Omit<PressableProps, 'style'> {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const variantStyles = {
  elevated: 'bg-white dark:bg-surface-dark',
  outlined: 'bg-transparent border border-gray-200 dark:border-gray-700',
  filled: 'bg-gray-100 dark:bg-gray-800',
};

export function Card({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View
      className={`rounded-2xl overflow-hidden ${variantStyles[variant]} ${paddingStyles[padding]}`}
      style={[variant === 'elevated' ? shadows.md : undefined, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function PressableCard({
  variant = 'elevated',
  padding = 'md',
  children,
  ...props
}: PressableCardProps) {
  return (
    <Pressable
      className={`rounded-2xl overflow-hidden ${variantStyles[variant]} ${paddingStyles[padding]} active:opacity-90`}
      style={variant === 'elevated' ? shadows.md : undefined}
      {...props}
    >
      {children}
    </Pressable>
  );
}
