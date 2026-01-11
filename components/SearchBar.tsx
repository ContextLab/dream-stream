import { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, touchTargetMinSize, borderRadius, fontFamily } from '@/theme/tokens';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = 'Search dreams...',
  value: controlledValue,
  onChangeText,
  onSubmit,
  onClear,
  autoFocus = false,
  debounceMs = 300,
}: SearchBarProps) {
  // Always use internal value for immediate display feedback
  const [displayValue, setDisplayValue] = useState(controlledValue ?? '');
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal state when controlled value changes externally (e.g., clear from parent)
  useEffect(() => {
    if (controlledValue !== undefined && controlledValue !== displayValue) {
      // Only sync if parent explicitly set a different value (like clearing)
      setDisplayValue(controlledValue);
    }
  }, [controlledValue]);

  const hasValue = displayValue.length > 0;

  const handleChangeText = useCallback(
    (text: string) => {
      // Immediately update display for instant visual feedback
      setDisplayValue(text);

      // Debounce the callback to parent (for search API calls)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onChangeText?.(text);
      }, debounceMs);
    },
    [onChangeText, debounceMs]
  );

  const handleClear = useCallback(() => {
    setDisplayValue('');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onClear?.();
    onChangeText?.('');
    inputRef.current?.focus();
  }, [onClear, onChangeText]);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    onSubmit?.(displayValue);
  }, [displayValue, onSubmit]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.gray[500]}
        value={displayValue}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmit}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {hasValue && (
        <Pressable
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={8}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252542',
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    minHeight: touchTargetMinSize,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    paddingVertical: 12,
    fontFamily: fontFamily.regular,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});
