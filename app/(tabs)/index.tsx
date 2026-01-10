import { useState, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Heading } from '@/components/ui/Text';
import { DreamFeed } from '@/components/DreamFeed';
import { CategoryFilter } from '@/components/CategoryFilter';
import { useDreams, useFeaturedDreams } from '@/hooks/useDreams';
import { useCategories } from '@/hooks/useCategories';
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
      <View className="px-4 pt-4 pb-2">
        <Heading variant="h2" color="primary">Dream Stream</Heading>
        <Text variant="bodySmall" color="secondary" style={{ marginTop: 4 }}>
          Discover your next dream experience
        </Text>
      </View>
      <CategoryFilter
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
        isLoading={categoriesLoading}
      />
      {selectedCategoryId === null && featuredDreams.length > 0 && (
        <View className="px-4 pt-4">
          <Text variant="label" color="secondary" style={{ marginBottom: 8 }}>
            Featured Dreams
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top']}>
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
