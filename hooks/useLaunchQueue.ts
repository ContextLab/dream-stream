import { useState, useEffect, useCallback } from 'react';
import {
  getQueuedDreams,
  getActiveQueueItem,
  addToQueue,
  removeFromQueue,
  markAsReady,
  markAsLaunched,
  markAsCompleted,
  cancelQueueItem,
  clearQueue,
  isInQueue,
  reorderQueue,
  reorderQueueByIndex,
  getNextQueueItem,
  shuffleQueue,
  getRepeatMode,
  setRepeatMode as setRepeatModeService,
  subscribeToQueueChanges,
  type QueuedDream,
} from '@/services/launchQueue';
import { useAuth } from './useAuth';
import type { TriggerMode, SleepStage, RepeatMode } from '@/types/database';

interface UseLaunchQueueReturn {
  queue: QueuedDream[];
  activeItem: QueuedDream | null;
  isLoading: boolean;
  error: Error | null;
  repeatMode: RepeatMode;
  refresh: () => Promise<void>;
  add: (dreamId: string, triggerMode?: TriggerMode, targetStage?: SleepStage) => Promise<void>;
  remove: (queueId: string) => Promise<void>;
  setReady: (queueId: string) => Promise<void>;
  launch: (queueId: string) => Promise<void>;
  complete: (queueId: string) => Promise<void>;
  cancel: (queueId: string) => Promise<void>;
  clear: () => Promise<void>;
  checkInQueue: (dreamId: string) => Promise<boolean>;
  moveUp: (queueId: string) => Promise<void>;
  moveDown: (queueId: string) => Promise<void>;
  reorderByIndex: (fromIndex: number, toIndex: number) => Promise<void>;
  getNext: () => Promise<QueuedDream | null>;
  shuffle: () => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => Promise<void>;
}

export function useLaunchQueue(): UseLaunchQueueReturn {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueuedDream[]>([]);
  const [activeItem, setActiveItem] = useState<QueuedDream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');

  const fetchQueue = useCallback(async () => {
    if (!user) {
      setQueue([]);
      setActiveItem(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [queueItems, active, currentRepeatMode] = await Promise.all([
        getQueuedDreams(user.id),
        getActiveQueueItem(user.id),
        getRepeatMode(),
      ]);
      setQueue(queueItems);
      setActiveItem(active);
      setRepeatModeState(currentRepeatMode);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load queue'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQueue();
    const unsubscribe = subscribeToQueueChanges(() => {
      fetchQueue();
    });
    return unsubscribe;
  }, [fetchQueue]);

  const handleAdd = useCallback(
    async (dreamId: string, triggerMode: TriggerMode = 'auto', targetStage: SleepStage = 'rem') => {
      if (!user) {
        throw new Error('Must be logged in to queue dreams');
      }

      try {
        await addToQueue(user.id, dreamId, triggerMode, targetStage);
        await fetchQueue();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add to queue');
        setError(error);
        throw error;
      }
    },
    [user, fetchQueue]
  );

  const handleRemove = useCallback(
    async (queueId: string) => {
      try {
        await removeFromQueue(queueId);
        setQueue((prev) => prev.filter((item) => item.id !== queueId));
        if (activeItem?.id === queueId) {
          setActiveItem(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove from queue'));
        throw err;
      }
    },
    [activeItem]
  );

  const handleSetReady = useCallback(
    async (queueId: string) => {
      try {
        await markAsReady(queueId);
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to set ready'));
        throw err;
      }
    },
    [fetchQueue]
  );

  const handleLaunch = useCallback(
    async (queueId: string) => {
      try {
        await markAsLaunched(queueId);
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to launch'));
        throw err;
      }
    },
    [fetchQueue]
  );

  const handleComplete = useCallback(
    async (queueId: string) => {
      try {
        await markAsCompleted(queueId);
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to complete'));
        throw err;
      }
    },
    [fetchQueue]
  );

  const handleCancel = useCallback(
    async (queueId: string) => {
      try {
        await cancelQueueItem(queueId);
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to cancel'));
        throw err;
      }
    },
    [fetchQueue]
  );

  const handleClear = useCallback(async () => {
    if (!user) return;

    try {
      await clearQueue(user.id);
      setQueue([]);
      setActiveItem(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear queue'));
      throw err;
    }
  }, [user]);

  const handleCheckInQueue = useCallback(
    async (dreamId: string): Promise<boolean> => {
      if (!user) return false;
      return isInQueue(user.id, dreamId);
    },
    [user]
  );

  const handleMoveUp = useCallback(
    async (queueId: string) => {
      if (!user) return;
      try {
        await reorderQueue(user.id, queueId, 'up');
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to reorder'));
        throw err;
      }
    },
    [user, fetchQueue]
  );

  const handleMoveDown = useCallback(
    async (queueId: string) => {
      if (!user) return;
      try {
        await reorderQueue(user.id, queueId, 'down');
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to reorder'));
        throw err;
      }
    },
    [user, fetchQueue]
  );

  const handleGetNext = useCallback(async (): Promise<QueuedDream | null> => {
    if (!user) return null;
    return getNextQueueItem(user.id);
  }, [user]);

  const handleShuffle = useCallback(async () => {
    if (!user) return;
    try {
      await shuffleQueue(user.id);
      await fetchQueue();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to shuffle'));
      throw err;
    }
  }, [user, fetchQueue]);

  const handleSetRepeatMode = useCallback(async (mode: RepeatMode) => {
    try {
      await setRepeatModeService(mode);
      setRepeatModeState(mode);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to set repeat mode'));
      throw err;
    }
  }, []);

  const handleReorderByIndex = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!user) return;
      try {
        await reorderQueueByIndex(user.id, fromIndex, toIndex);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to reorder'));
        throw err;
      }
    },
    [user]
  );

  return {
    queue,
    activeItem,
    isLoading,
    error,
    repeatMode,
    refresh: fetchQueue,
    add: handleAdd,
    remove: handleRemove,
    setReady: handleSetReady,
    launch: handleLaunch,
    complete: handleComplete,
    cancel: handleCancel,
    clear: handleClear,
    checkInQueue: handleCheckInQueue,
    moveUp: handleMoveUp,
    moveDown: handleMoveDown,
    reorderByIndex: handleReorderByIndex,
    getNext: handleGetNext,
    shuffle: handleShuffle,
    setRepeatMode: handleSetRepeatMode,
  };
}

export function useQueueStatus(dreamId: string) {
  const { queue, isLoading } = useLaunchQueue();
  const inQueue = queue.some((item) => item.dream_id === dreamId);
  return { inQueue, isLoading };
}
