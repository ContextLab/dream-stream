import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { DreamPlayer } from '@/components/DreamPlayer';
import { DreamRecommendations } from '@/components/DreamRecommendations';
import { FavoriteButton } from '@/components/FavoriteButton';
import { QueueButton } from '@/components/QueueButton';
import { getDreamById, incrementViewCount } from '@/services/dreams';
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { Dream, PlaybackMode } from '@/types/database';

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [dream, setDream] = useState<Dream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('full');
  const [showFullText, setShowFullText] = useState(false);

  const {
    initialPosition,
    isLoading: progressLoading,
    saveProgress,
    markCompleted,
  } = usePlaybackProgress({
    dreamId: id || '',
    durationSeconds: dream?.full_duration_seconds || 0,
    userId: null,
  });

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    async function fetchDream() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getDreamById(id);
        if (mounted) {
          if (data) {
            setDream(data);
            incrementViewCount(id);
          } else {
            setError(new Error('Dream not found'));
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load dream'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDream();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleProgress = useCallback(
    (positionSeconds: number) => {
      saveProgress(positionSeconds);
    },
    [saveProgress]
  );

  const handleComplete = useCallback(() => {
    markCompleted();
  }, [markCompleted]);

  if (isLoading || progressLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </SafeAreaView>
    );
  }

  if (error || !dream) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text variant="h4" color="error" align="center">
          {error?.message || 'Dream not found'}
        </Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text variant="body" color="primary">
            Go Back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="box-none">
        <Pressable onPress={() => router.replace('/')} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <View style={styles.headerSpacer} pointerEvents="none" />
        <View style={styles.headerActions}>
          <QueueButton dreamId={id || ''} showBackground size={22} />
          <FavoriteButton dreamId={id || ''} showBackground />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollContent} bounces={false}>
        <View style={styles.modeSelector}>
          <Pressable
            style={[styles.modeButton, playbackMode === 'preview' && styles.modeButtonActive]}
            onPress={() => setPlaybackMode('preview')}
          >
            <Text variant="bodySmall" color={playbackMode === 'preview' ? 'primary' : 'secondary'}>
              Preview
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, playbackMode === 'full' && styles.modeButtonActive]}
            onPress={() => setPlaybackMode('full')}
          >
            <Text variant="bodySmall" color={playbackMode === 'full' ? 'primary' : 'secondary'}>
              Full Dream
            </Text>
          </Pressable>
        </View>

        <DreamPlayer
          dream={dream}
          playbackMode={playbackMode}
          initialPosition={initialPosition}
          onProgress={handleProgress}
          onComplete={handleComplete}
        />

        <View style={styles.details}>
          {dream.summary && (
            <Text variant="body" color="secondary" style={styles.description}>
              {dream.summary}
            </Text>
          )}

          <Pressable style={styles.readFullButton} onPress={() => setShowFullText(true)}>
            <Ionicons name="book-outline" size={18} color={colors.primary[400]} />
            <Text variant="bodySmall" color="primary">
              Read Full Script
            </Text>
          </Pressable>

          {dream.tags && dream.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {dream.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text variant="caption" color="muted">
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <DreamRecommendations dreamId={dream.id} />

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        visible={showFullText}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFullText(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text
              variant="h4"
              weight="semibold"
              color="primary"
              numberOfLines={1}
              style={styles.modalTitle}
            >
              {dream.title}
            </Text>
            <Pressable onPress={() => setShowFullText(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={colors.gray[400]} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
          >
            <Text variant="body" color="secondary" style={styles.fullText}>
              {dream.content.replace(/\[PAUSE\]/g, '\n\n')}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090b',
    padding: spacing.xl,
  },
  backButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  headerSpacer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scrollContent: {
    flex: 1,
    marginTop: 60,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[800],
    overflow: 'hidden',
  },
  modeButtonActive: {
    backgroundColor: colors.gray[800],
    borderColor: colors.primary[700],
  },
  details: {
    padding: spacing.md,
  },
  description: {
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: '#27272a',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  bottomPadding: {
    height: spacing['3xl'],
  },
  readFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  modalTitle: {
    flex: 1,
    marginRight: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  fullText: {
    lineHeight: 28,
  },
});
