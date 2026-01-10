import { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Heading } from '@/components/ui/Text';
import { SearchBar } from '@/components/SearchBar';
import { DreamCard } from '@/components/DreamCard';
import { useSearchDreams } from '@/hooks/useDreams';
import { colors, spacing } from '@/theme/tokens';
import type { DreamListItem } from '@/types/database';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { results, isSearching, error, search, clear } = useSearchDreams();

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        search(query);
      } else {
        clear();
      }
    },
    [search, clear]
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    clear();
  }, [clear]);

  const renderItem = useCallback(
    ({ item }: { item: DreamListItem }) => (
      <View style={styles.cardContainer}>
        <DreamCard dream={item} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: DreamListItem) => item.id, []);

  const renderEmptyComponent = useCallback(() => {
    if (isSearching) return null;

    if (searchQuery.trim() === '') {
      return (
        <View style={styles.emptyContainer}>
          <Text variant="h4" color="muted" align="center">
            Search for dreams
          </Text>
          <Text variant="bodySmall" color="muted" align="center" style={styles.emptySubtext}>
            Find dreams by title, category, or tags
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant="body" color="error" align="center">
            {error.message}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text variant="h4" color="muted" align="center">
          No results found
        </Text>
        <Text variant="bodySmall" color="muted" align="center" style={styles.emptySubtext}>
          Try different keywords or browse categories
        </Text>
      </View>
    );
  }, [isSearching, searchQuery, error]);

  return (
    <SafeAreaView className="flex-1 bg-background-dark" edges={['top']}>
      <View className="flex-1">
        <View className="px-4 pt-4 pb-2">
          <Heading variant="h2" color="primary">Search</Heading>
        </View>
        <View className="px-4 py-2">
          <SearchBar
            placeholder="Search dreams..."
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={handleClear}
            autoFocus={false}
            debounceMs={400}
          />
        </View>
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
          </View>
        )}
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptySubtext: {
    marginTop: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
