import { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, MonoText } from '@/components/ui/Text';
import { DreamFeed } from '@/components/DreamFeed';
import { CategoryFilter } from '@/components/CategoryFilter';
import { useDreams, useFeaturedDreams } from '@/hooks/useDreams';
import { useCategories } from '@/hooks/useCategories';
import { colors, spacing } from '@/theme/tokens';
import type { DreamListOptions } from '@/services/dreams';

export default function HomeScreen() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { categories, isLoading: categoriesLoading } = useCategories();

  const dreamsOptions = useMemo<DreamListOptions>(
    () => (selectedCategoryId ? { filters: { categoryId: selectedCategoryId } } : {}),
    [selectedCategoryId]
  );

  const {
    dreams,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  } = useDreams(dreamsOptions);

  const { dreams: featuredDreams } = useFeaturedDreams(3);

  const headerComponent = (
    <View>
      <View style={styles.header}>
        <Text variant="h2" weight="bold">dream_stream</Text>
        <MonoText color="muted" style={styles.subtitle}>
          // explore your subconscious
        </MonoText>
      </View>
      <CategoryFilter
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
        isLoading={categoriesLoading}
      />
      {selectedCategoryId === null && featuredDreams.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text variant="label" color="accent">
            FEATURED
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DreamFeed
        dreams={dreams}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        error={error}
        onRefresh={refresh}
        onLoadMore={loadMore}
        ListHeaderComponent={headerComponent}
        emptyMessage={
          selectedCategoryId
            ? 'No dreams found in this category'
            : 'No dreams available yet'
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[950],
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  subtitle: {
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
