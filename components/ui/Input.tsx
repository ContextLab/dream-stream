import { forwardRef, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import { touchTargetMinSize } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerStyle,
      editable = true,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = error
      ? 'border-red-500'
      : isFocused
        ? 'border-primary-500'
        : 'border-gray-300 dark:border-gray-600';

    const backgroundColor = editable
      ? 'bg-white dark:bg-gray-900'
      : 'bg-gray-100 dark:bg-gray-800';

    return (
      <View style={containerStyle}>
        {label && (
          <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            {label}
          </Text>
        )}
        <View
          className={`flex-row items-center rounded-xl border ${borderColor} ${backgroundColor} px-4`}
          style={{ minHeight: touchTargetMinSize }}
        >
          {leftIcon && <View className="mr-3">{leftIcon}</View>}
          <TextInput
            ref={ref}
            className="flex-1 py-3 text-base text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
            editable={editable}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon && <View className="ml-3">{rightIcon}</View>}
        </View>
        {(error || helperText) && (
          <Text
            className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

interface PasswordInputProps extends Omit<InputProps, 'secureTextEntry'> {
  showPasswordIcon?: React.ReactNode;
  hidePasswordIcon?: React.ReactNode;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  ({ showPasswordIcon, hidePasswordIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleIcon = (
      <Pressable
        onPress={() => setShowPassword(!showPassword)}
        hitSlop={8}
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
      >
        <Text className="text-gray-500">{showPassword ? 'Hide' : 'Show'}</Text>
      </Pressable>
    );

    return (
      <Input
        ref={ref}
        secureTextEntry={!showPassword}
        rightIcon={showPasswordIcon && hidePasswordIcon ? (showPassword ? hidePasswordIcon : showPasswordIcon) : toggleIcon}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
