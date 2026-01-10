import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, touchTargetMinSize, borderRadius } from '@/theme/tokens';

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
  const [internalValue, setInternalValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value = controlledValue ?? internalValue;
  const hasValue = value.length > 0;

  const handleChangeText = useCallback(
    (text: string) => {
      // Always update internal value for immediate UI feedback
      setInternalValue(text);

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
    setInternalValue('');
    onClear?.();
    onChangeText?.('');
    inputRef.current?.focus();
  }, [onClear, onChangeText]);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    onSubmit?.(value);
  }, [value, onSubmit]);

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
        value={value}
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
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
});
