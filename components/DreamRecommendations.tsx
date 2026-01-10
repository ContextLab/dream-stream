import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { DreamCard } from './DreamCard';
import { Text } from '@/components/ui/Text';
import { getRelatedDreams } from '@/services/dreams';
import { colors, spacing } from '@/theme/tokens';
import type { DreamListItem } from '@/types/database';

interface DreamRecommendationsProps {
  dreamId: string;
  title?: string;
  limit?: number;
}

export function DreamRecommendations({
  dreamId,
  title = 'Related Dreams',
  limit = 6,
}: DreamRecommendationsProps) {
  const [dreams, setDreams] = useState<DreamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRecommendations() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getRelatedDreams(dreamId, limit);
        if (mounted) {
          setDreams(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load recommendations'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchRecommendations();

    return () => {
      mounted = false;
    };
  }, [dreamId, limit]);

  const renderItem = useCallback(
    ({ item }: { item: DreamListItem }) => (
      <View style={styles.cardContainer}>
        <DreamCard dream={item} variant="featured" />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: DreamListItem) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  if (error || dreams.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="h4" weight="semibold" style={styles.title}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={dreams}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  title: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  cardContainer: {
    marginRight: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});
