import { useCallback, memo } from 'react';
import { ScrollView, View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { Category } from '@/types/database';
import { colors, spacing, borderRadius, touchTargetMinSize } from '@/theme/tokens';

interface CategoryFilterProps {
  categories: Category[];
  selectedIds: Set<string>;
  onToggle: (categoryId: string) => void;
  onClearAll: () => void;
  isLoading?: boolean;
}

export function CategoryFilter({
  categories,
  selectedIds,
  onToggle,
  onClearAll,
  isLoading = false,
}: CategoryFilterProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  const hasSelection = selectedIds.size > 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <CategoryChip label="All" isSelected={!hasSelection} onPress={onClearAll} />
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          label={category.name}
          color={category.color}
          isSelected={selectedIds.has(category.slug)}
          onPress={() => onToggle(category.slug)}
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

const CategoryChip = memo(function CategoryChip({
  label,
  color,
  isSelected,
  onPress,
}: CategoryChipProps) {
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
    backgroundColor: colors.gray[800],
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
