import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPlaybackProgress,
  savePlaybackProgress,
  clearPlaybackProgress,
  shouldResumePlayback,
} from '@/services/playback';
import { PLAYBACK } from '@/lib/constants';

interface UsePlaybackProgressOptions {
  dreamId: string;
  durationSeconds: number;
  userId?: string | null;
  autoSave?: boolean;
}

interface UsePlaybackProgressReturn {
  initialPosition: number;
  isCompleted: boolean;
  isLoading: boolean;
  shouldResume: boolean;
  saveProgress: (positionSeconds: number) => Promise<void>;
  clearProgress: () => Promise<void>;
  markCompleted: () => Promise<void>;
}

export function usePlaybackProgress({
  dreamId,
  durationSeconds,
  userId = null,
  autoSave = true,
}: UsePlaybackProgressOptions): UsePlaybackProgressReturn {
  const [initialPosition, setInitialPosition] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastSavedPosition = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      setIsLoading(true);
      const progress = await getPlaybackProgress(dreamId, userId);
      
      if (mounted) {
        if (progress) {
          setInitialPosition(progress.positionSeconds);
          setIsCompleted(progress.completed);
          lastSavedPosition.current = progress.positionSeconds;
        } else {
          setInitialPosition(0);
          setIsCompleted(false);
          lastSavedPosition.current = 0;
        }
        setIsLoading(false);
      }
    }

    loadProgress();

    return () => {
      mounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [dreamId, userId]);

  const saveProgress = useCallback(
    async (positionSeconds: number) => {
      if (!autoSave) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const positionDelta = Math.abs(positionSeconds - lastSavedPosition.current);
        
        if (positionDelta >= 1) {
          await savePlaybackProgress(dreamId, positionSeconds, durationSeconds, userId);
          lastSavedPosition.current = positionSeconds;
          
          const completed = positionSeconds / durationSeconds >= PLAYBACK.COMPLETION_THRESHOLD;
          setIsCompleted(completed);
        }
      }, PLAYBACK.PROGRESS_SAVE_INTERVAL_MS);
    },
    [dreamId, durationSeconds, userId, autoSave]
  );

  const clearProgress = useCallback(async () => {
    await clearPlaybackProgress(dreamId, userId);
    setInitialPosition(0);
    setIsCompleted(false);
    lastSavedPosition.current = 0;
  }, [dreamId, userId]);

  const markCompleted = useCallback(async () => {
    await savePlaybackProgress(dreamId, durationSeconds, durationSeconds, userId);
    setIsCompleted(true);
  }, [dreamId, durationSeconds, userId]);

  const shouldResume = shouldResumePlayback(initialPosition) && !isCompleted;

  return {
    initialPosition,
    isCompleted,
    isLoading,
    shouldResume,
    saveProgress,
    clearProgress,
    markCompleted,
  };
}
