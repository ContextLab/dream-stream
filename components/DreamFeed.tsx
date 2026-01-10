import { useCallback } from 'react';
import {
  FlatList,
  View,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { DreamCard } from './DreamCard';
import { Text } from '@/components/ui/Text';
import type { DreamListItem } from '@/types/database';
import { colors, spacing } from '@/theme/tokens';

interface DreamFeedProps {
  dreams: DreamListItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  onRefresh: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
  numColumns?: 1 | 2;
}

export function DreamFeed({
  dreams,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  onRefresh,
  onLoadMore,
  emptyMessage = 'No dreams found',
  ListHeaderComponent,
  numColumns = 1,
}: DreamFeedProps) {
  const renderItem: ListRenderItem<DreamListItem> = useCallback(
    ({ item }) => (
      <View style={numColumns === 2 ? styles.gridItem : styles.listItem}>
        <DreamCard dream={item} variant={numColumns === 2 ? 'default' : 'default'} />
      </View>
    ),
    [numColumns]
  );

  const keyExtractor = useCallback((item: DreamListItem) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text color="muted" align="center">
          {error ? error.message : emptyMessage}
        </Text>
      </View>
    );
  }, [isLoading, error, emptyMessage]);

  if (isLoading && dreams.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <FlatList
      data={dreams}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      key={numColumns}
      contentContainerStyle={styles.container}
      columnWrapperStyle={numColumns === 2 ? styles.row : undefined}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && dreams.length > 0}
          onRefresh={onRefresh}
          tintColor={colors.primary[500]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  listItem: {
    marginBottom: spacing.md,
  },
  gridItem: {
    flex: 1,
    margin: spacing.xs,
  },
  row: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
