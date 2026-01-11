import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, MonoText } from '@/components/ui/Text';
import { DreamFeed } from '@/components/DreamFeed';
import { CategoryFilter } from '@/components/CategoryFilter';
import { useDreams } from '@/hooks/useDreams';
import { useCategories } from '@/hooks/useCategories';
import { useFavorites } from '@/hooks/useFavorites';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { DreamListOptions } from '@/services/dreams';

export default function HomeScreen() {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const { categories, isLoading: categoriesLoading } = useCategories();

  const handleToggleCategory = useCallback((categorySlug: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categorySlug)) {
        next.delete(categorySlug);
      } else {
        next.add(categorySlug);
      }
      return next;
    });
  }, []);

  const handleClearCategories = useCallback(() => {
    setSelectedCategories(new Set());
  }, []);

  const dreamsOptions = useMemo<DreamListOptions>(
    () =>
      selectedCategories.size > 0 ? { filters: { categorySlugs: [...selectedCategories] } } : {},
    [selectedCategories]
  );

  const { favoriteIds } = useFavorites();

  const dreamsOptionsWithFavorites = useMemo<DreamListOptions>(
    () => ({ ...dreamsOptions, favoriteIds }),
    [dreamsOptions, favoriteIds]
  );

  const { dreams, isLoading, isLoadingMore, hasMore, error, refresh, loadMore } = useDreams(
    dreamsOptionsWithFavorites
  );

  const headerComponent = (
    <View>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="h2" weight="bold">
            dream_stream
          </Text>
          <Link href={'/about' as any} asChild>
            <Pressable style={styles.aboutButton} hitSlop={8}>
              <Ionicons name="information-circle-outline" size={24} color={colors.gray[400]} />
            </Pressable>
          </Link>
        </View>
        <MonoText color="muted" style={styles.subtitle}>
          // guided lucid dreaming
        </MonoText>
      </View>
      <View style={styles.instructionsCard}>
        <Text variant="bodySmall" color="secondary" style={styles.instructionsText}>
          Drift into vivid, conscious dreams. Each journey guides you gently through immersive
          dreamscapes with moments of quiet for your imagination to take flight.
        </Text>
      </View>
      <CategoryFilter
        categories={categories}
        selectedIds={selectedCategories}
        onToggle={handleToggleCategory}
        onClearAll={handleClearCategories}
        isLoading={categoriesLoading}
      />
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
          selectedCategories.size > 0
            ? 'No dreams found in selected categories'
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutButton: {
    padding: 4,
  },
  subtitle: {
    marginTop: 4,
  },
  instructionsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.gray[900],
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
  },
  instructionsText: {
    lineHeight: 20,
  },
});
