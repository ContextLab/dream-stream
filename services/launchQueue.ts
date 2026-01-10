import { storage } from '@/lib/storage';
import type {
  DreamLaunchQueue,
  LaunchStatus,
  TriggerMode,
  SleepStage,
  Dream,
  RepeatMode,
} from '@/types/database';
import { getDreamById } from './dreams';

const STORAGE_KEY_QUEUE = 'dream_launch_queue';
const STORAGE_KEY_SETTINGS = 'dream_queue_settings';

export interface QueuedDream extends DreamLaunchQueue {
  dream: Dream;
}

interface LocalQueue {
  items: DreamLaunchQueue[];
}

interface QueueSettings {
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
}

async function getLocalQueue(): Promise<LocalQueue> {
  const data = await storage.get<LocalQueue>(STORAGE_KEY_QUEUE);
  return data || { items: [] };
}

async function setLocalQueue(queue: LocalQueue): Promise<void> {
  await storage.set(STORAGE_KEY_QUEUE, queue);
}

async function getQueueSettings(): Promise<QueueSettings> {
  const data = await storage.get<QueueSettings>(STORAGE_KEY_SETTINGS);
  return data || { repeatMode: 'off', shuffleEnabled: false };
}

async function setQueueSettings(settings: QueueSettings): Promise<void> {
  await storage.set(STORAGE_KEY_SETTINGS, settings);
}

export async function getRepeatMode(): Promise<RepeatMode> {
  const settings = await getQueueSettings();
  return settings.repeatMode;
}

export async function setRepeatMode(mode: RepeatMode): Promise<void> {
  const settings = await getQueueSettings();
  settings.repeatMode = mode;
  await setQueueSettings(settings);
}

export async function getShuffleEnabled(): Promise<boolean> {
  const settings = await getQueueSettings();
  return settings.shuffleEnabled;
}

export async function setShuffleEnabled(enabled: boolean): Promise<void> {
  const settings = await getQueueSettings();
  settings.shuffleEnabled = enabled;
  await setQueueSettings(settings);
}

export async function shuffleQueue(userId: string): Promise<void> {
  const queue = await getLocalQueue();
  const activeItems = queue.items.filter(
    (item) => item.user_id === userId && ['pending', 'ready'].includes(item.status)
  );
  const inactiveItems = queue.items.filter(
    (item) => item.user_id !== userId || !['pending', 'ready'].includes(item.status)
  );

  for (let i = activeItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeItems[i], activeItems[j]] = [activeItems[j], activeItems[i]];
  }

  queue.items = [...activeItems, ...inactiveItems];
  await setLocalQueue(queue);
}

export async function getQueuedDreams(userId: string): Promise<QueuedDream[]> {
  const queue = await getLocalQueue();
  const activeItems = queue.items.filter(
    (item) => item.user_id === userId && ['pending', 'ready'].includes(item.status)
  );

  const queuedDreams: QueuedDream[] = [];
  for (const item of activeItems) {
    const dream = await getDreamById(item.dream_id);
    if (dream) {
      queuedDreams.push({ ...item, dream });
    }
  }
  return queuedDreams;
}

export async function getActiveQueueItem(userId: string): Promise<QueuedDream | null> {
  const queue = await getLocalQueue();
  const readyItem = queue.items.find((item) => item.user_id === userId && item.status === 'ready');

  if (!readyItem) return null;

  const dream = await getDreamById(readyItem.dream_id);
  if (!dream) return null;

  return { ...readyItem, dream };
}

export async function addToQueue(
  userId: string,
  dreamId: string,
  triggerMode: TriggerMode = 'auto',
  targetSleepStage: SleepStage = 'rem'
): Promise<DreamLaunchQueue> {
  const queue = await getLocalQueue();

  const existing = queue.items.find(
    (item) =>
      item.user_id === userId &&
      item.dream_id === dreamId &&
      ['pending', 'ready'].includes(item.status)
  );

  if (existing) {
    throw new Error('This dream is already in your queue');
  }

  const newItem: DreamLaunchQueue = {
    id: `queue-${Date.now()}`,
    user_id: userId,
    dream_id: dreamId,
    status: 'pending',
    trigger_mode: triggerMode,
    target_sleep_stage: targetSleepStage,
    created_at: new Date().toISOString(),
    launched_at: null,
  };

  queue.items.push(newItem);
  await setLocalQueue(queue);

  return newItem;
}

export async function removeFromQueue(queueId: string): Promise<void> {
  const queue = await getLocalQueue();
  queue.items = queue.items.filter((item) => item.id !== queueId);
  await setLocalQueue(queue);
}

export async function updateQueueStatus(
  queueId: string,
  status: LaunchStatus
): Promise<DreamLaunchQueue> {
  const queue = await getLocalQueue();
  const item = queue.items.find((i) => i.id === queueId);

  if (!item) {
    throw new Error('Queue item not found');
  }

  item.status = status;
  if (status === 'launched') {
    item.launched_at = new Date().toISOString();
  }

  await setLocalQueue(queue);
  return item;
}

export async function markAsReady(queueId: string): Promise<DreamLaunchQueue> {
  return updateQueueStatus(queueId, 'ready');
}

export async function markAsLaunched(queueId: string): Promise<DreamLaunchQueue> {
  return updateQueueStatus(queueId, 'launched');
}

export async function markAsCompleted(queueId: string): Promise<DreamLaunchQueue> {
  return updateQueueStatus(queueId, 'completed');
}

export async function cancelQueueItem(queueId: string): Promise<DreamLaunchQueue> {
  return updateQueueStatus(queueId, 'cancelled');
}

export async function clearQueue(userId: string): Promise<void> {
  const queue = await getLocalQueue();
  queue.items = queue.items.filter(
    (item) => item.user_id !== userId || !['pending', 'ready'].includes(item.status)
  );
  await setLocalQueue(queue);
}

export async function isInQueue(userId: string, dreamId: string): Promise<boolean> {
  const queue = await getLocalQueue();
  return queue.items.some(
    (item) =>
      item.user_id === userId &&
      item.dream_id === dreamId &&
      ['pending', 'ready'].includes(item.status)
  );
}

export async function getQueueHistory(userId: string, limit: number = 10): Promise<QueuedDream[]> {
  const queue = await getLocalQueue();
  const historyItems = queue.items
    .filter((item) => item.user_id === userId && ['completed', 'cancelled'].includes(item.status))
    .slice(0, limit);

  const queuedDreams: QueuedDream[] = [];
  for (const item of historyItems) {
    const dream = await getDreamById(item.dream_id);
    if (dream) {
      queuedDreams.push({ ...item, dream });
    }
  }
  return queuedDreams;
}

export async function reorderQueue(
  userId: string,
  queueId: string,
  direction: 'up' | 'down'
): Promise<void> {
  const queue = await getLocalQueue();
  const activeItems = queue.items.filter(
    (item) => item.user_id === userId && ['pending', 'ready'].includes(item.status)
  );
  const inactiveItems = queue.items.filter(
    (item) => item.user_id !== userId || !['pending', 'ready'].includes(item.status)
  );

  const currentIndex = activeItems.findIndex((item) => item.id === queueId);
  if (currentIndex === -1) return;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= activeItems.length) return;

  const temp = activeItems[currentIndex];
  activeItems[currentIndex] = activeItems[newIndex];
  activeItems[newIndex] = temp;

  queue.items = [...activeItems, ...inactiveItems];
  await setLocalQueue(queue);
}

export async function getNextQueueItem(userId: string): Promise<QueuedDream | null> {
  const queue = await getLocalQueue();
  const pendingItems = queue.items.filter(
    (item) => item.user_id === userId && item.status === 'pending'
  );

  if (pendingItems.length === 0) return null;

  const dream = await getDreamById(pendingItems[0].dream_id);
  if (!dream) return null;

  return { ...pendingItems[0], dream };
}

export function getStatusDisplayName(status: LaunchStatus): string {
  const names: Record<LaunchStatus, string> = {
    pending: 'Pending',
    ready: 'Ready to Launch',
    launched: 'Launching...',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return names[status];
}

export function getStatusColor(status: LaunchStatus): string {
  const colors: Record<LaunchStatus, string> = {
    pending: '#6b7280',
    ready: '#22c55e',
    launched: '#8b5cf6',
    completed: '#3b82f6',
    cancelled: '#ef4444',
  };
  return colors[status];
}
