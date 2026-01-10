import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Heading } from '@/components/ui/Text';
import { PlaybackControls } from '@/components/PlaybackControls';
import { DreamRecommendations } from '@/components/DreamRecommendations';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ShareButton } from '@/components/ShareButton';
import { getDreamById, incrementViewCount } from '@/services/dreams';
import { usePlaybackProgress } from '@/hooks/usePlaybackProgress';
import { useAuth } from '@/hooks/useAuth';
import { useLaunchQueue, useQueueStatus } from '@/hooks/useLaunchQueue';
import { colors, spacing, borderRadius } from '@/theme/tokens';
import type { Dream } from '@/types/database';

type PlayerStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [dream, setDream] = useState<Dream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('idle');

  const { add: addToQueue } = useLaunchQueue();
  const { inQueue } = useQueueStatus(id || '');

  const {
    initialPosition,
    shouldResume,
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
      setCurrentTime(positionSeconds);
      saveProgress(positionSeconds);
    },
    [saveProgress]
  );

  const handleComplete = useCallback(() => {
    markCompleted();
    setIsPlaying(false);
  }, [markCompleted]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleSeekRelative = useCallback((delta: number) => {
    setCurrentTime((prev) => Math.max(0, prev + delta));
  }, []);

  const handleAddToQueue = useCallback(async () => {
    if (!id) return;
    
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Create an account to queue dreams for sleep mode.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    try {
      await addToQueue(id);
      Alert.alert('Added to Queue', 'Dream added to your sleep queue. Go to Sleep Mode to launch it.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to queue';
      Alert.alert('Error', message);
    }
  }, [id, isAuthenticated, addToQueue, router]);

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

      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </Pressable>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.headerButton, inQueue && styles.headerButtonActive]}
            onPress={handleAddToQueue}
            hitSlop={8}
          >
            <Ionicons
              name={inQueue ? 'moon' : 'moon-outline'}
              size={22}
              color={inQueue ? colors.primary[400] : '#ffffff'}
            />
          </Pressable>
          <FavoriteButton dreamId={id || ''} showBackground />
          <ShareButton dreamId={id || ''} dreamTitle={dream?.title || ''} showBackground />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollContent} bounces={false}>
        <View style={styles.artworkContainer}>
          <Image
            source={{ uri: dream.artwork_url }}
            style={styles.artwork}
            resizeMode="cover"
          />
          <View style={styles.artworkOverlay}>
            <Pressable style={styles.playButton} onPress={handlePlayPause}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={48}
                color="#ffffff"
              />
            </Pressable>
          </View>
        </View>

        <PlaybackControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={dream.full_duration_seconds}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSeekRelative={handleSeekRelative}
        />

        <View style={styles.details}>
          <Heading variant="h3" color="primary">
            {dream.title}
          </Heading>

          {dream.category && (
            <View style={styles.categoryRow}>
              {dream.category.color && (
                <View style={[styles.categoryDot, { backgroundColor: dream.category.color }]} />
              )}
              <Text variant="bodySmall" color="secondary">
                {dream.category.name}
              </Text>
            </View>
          )}

          {dream.summary && (
            <Text variant="body" color="secondary" style={styles.description}>
              {dream.summary}
            </Text>
          )}

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
  headerButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  scrollContent: {
    flex: 1,
  },
  artworkContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#18181b',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 6,
  },
  details: {
    padding: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  description: {
    marginTop: spacing.md,
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
});
