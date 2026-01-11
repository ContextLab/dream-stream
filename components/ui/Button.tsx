import { forwardRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { touchTargetMinSize, fontFamily } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary-500 active:bg-primary-600',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-secondary-500 active:bg-secondary-600',
    text: 'text-white',
  },
  outline: {
    container: 'border border-primary-500 bg-transparent active:bg-primary-500/10',
    text: 'text-primary-500',
  },
  ghost: {
    container: 'bg-transparent active:bg-gray-100 dark:active:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-200',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: {
    container: 'px-3 py-2',
    text: 'text-sm',
  },
  md: {
    container: 'px-4 py-3',
    text: 'text-base',
  },
  lg: {
    container: 'px-6 py-4',
    text: 'text-lg',
  },
};

export const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      style,
      textStyle,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];

    return (
      <TouchableOpacity
        ref={ref}
        disabled={isDisabled}
        className={`flex-row items-center justify-center rounded-xl ${variantStyle.container} ${sizeStyle.container} ${isDisabled ? 'opacity-50' : ''}`}
        style={[{ minHeight: touchTargetMinSize }, style]}
        activeOpacity={0.7}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'secondary' ? '#fff' : '#6366f1'}
          />
        ) : (
          <>
            {leftIcon}
            <Text
              className={`font-semibold ${variantStyle.text} ${sizeStyle.text} ${leftIcon ? 'ml-2' : ''} ${rightIcon ? 'mr-2' : ''}`}
              style={[{ fontFamily: fontFamily.bold }, textStyle]}
            >
              {children}
            </Text>
            {rightIcon}
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';
