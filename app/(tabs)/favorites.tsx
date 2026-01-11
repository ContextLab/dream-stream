import { useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { DreamCard } from '@/components/DreamCard';
import { useFavoritesContext } from '@/components/FavoritesProvider';
import { colors, spacing } from '@/theme/tokens';
import type { DreamListItem } from '@/types/database';

export default function FavoritesScreen() {
  const { favorites, isLoading, refresh } = useFavoritesContext();

  const renderItem = useCallback(
    ({ item }: { item: DreamListItem }) => (
      <View style={styles.cardContainer}>
        <DreamCard dream={item} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: DreamListItem) => item.id, []);

  if (isLoading && favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">
            Favorites
          </Heading>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Heading variant="h2" color="primary">
            Favorites
          </Heading>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="heart-outline" size={64} color={colors.gray[500]} />
          <Text variant="h4" color="primary" style={styles.emptyTitle}>
            No Favorites Yet
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.emptySubtitle}>
            Tap the heart icon on any dream to save it here
          </Text>
          <Link href="/(tabs)" asChild>
            <Button variant="primary" style={styles.signInButton}>
              Explore Dreams
            </Button>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Heading variant="h2" color="primary">
              Favorites
            </Heading>
            <Text variant="bodySmall" color="secondary" style={styles.countText}>
              {favorites.length} {favorites.length === 1 ? 'dream' : 'dreams'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  countText: {
    marginTop: spacing.xs,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  signInButton: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
  errorText: {
    marginVertical: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
});
