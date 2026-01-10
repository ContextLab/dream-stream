import { useCallback, memo } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import type { Category } from '@/types/database';
import { colors, spacing, borderRadius, touchTargetMinSize } from '@/theme/tokens';

interface CategoryFilterProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  isLoading?: boolean;
}

export function CategoryFilter({
  categories,
  selectedId,
  onSelect,
  isLoading = false,
}: CategoryFilterProps) {
  const handlePress = useCallback(
    (categoryId: string | null) => {
      onSelect(categoryId === selectedId ? null : categoryId);
    },
    [selectedId, onSelect]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <CategoryChip
        label="All"
        isSelected={selectedId === null}
        onPress={() => handlePress(null)}
      />
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          label={category.name}
          color={category.color}
          isSelected={selectedId === category.id}
          onPress={() => handlePress(category.id)}
        />
      ))}
    </ScrollView>
  );
}

interface CategoryChipProps {
  label: string;
  color?: string | null;
  isSelected: boolean;
  onPress: () => void;
}

const CategoryChip = memo(function CategoryChip({ label, color, isSelected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        isSelected && color ? { backgroundColor: color } : null,
      ]}
    >
      {color && !isSelected && <View style={[styles.colorDot, { backgroundColor: color }]} />}
      <Text
        variant="bodySmall"
        weight={isSelected ? 'semibold' : 'normal'}
        style={[styles.chipText, isSelected && styles.chipTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  loadingContainer: {
    height: touchTargetMinSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: '#252542',
    minHeight: 36,
  },
  chipSelected: {
    backgroundColor: colors.primary[500],
  },
  chipText: {
    color: colors.gray[300],
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
