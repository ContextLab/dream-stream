import { storage } from '@/lib/storage';
import { STORAGE_KEYS, PLAYBACK } from '@/lib/constants';

interface LocalPlaybackProgress {
  [dreamId: string]: {
    positionSeconds: number;
    completed: boolean;
    updatedAt: string;
  };
}

async function getLocalProgress(): Promise<LocalPlaybackProgress> {
  const data = await storage.get<LocalPlaybackProgress>(STORAGE_KEYS.PLAYBACK_PROGRESS);
  return data || {};
}

async function setLocalProgress(progress: LocalPlaybackProgress): Promise<void> {
  await storage.set(STORAGE_KEYS.PLAYBACK_PROGRESS, progress);
}

export async function getPlaybackProgress(
  dreamId: string,
  _userId?: string | null
): Promise<{ positionSeconds: number; completed: boolean } | null> {
  const localProgress = await getLocalProgress();
  const dreamProgress = localProgress[dreamId];
  
  if (dreamProgress) {
    return {
      positionSeconds: dreamProgress.positionSeconds,
      completed: dreamProgress.completed,
    };
  }

  return null;
}

export async function savePlaybackProgress(
  dreamId: string,
  positionSeconds: number,
  durationSeconds: number,
  _userId?: string | null
): Promise<void> {
  const completed = positionSeconds / durationSeconds >= PLAYBACK.COMPLETION_THRESHOLD;
  const now = new Date().toISOString();

  const localProgress = await getLocalProgress();
  localProgress[dreamId] = {
    positionSeconds,
    completed,
    updatedAt: now,
  };
  await setLocalProgress(localProgress);
}

export async function clearPlaybackProgress(
  dreamId: string,
  _userId?: string | null
): Promise<void> {
  const localProgress = await getLocalProgress();
  delete localProgress[dreamId];
  await setLocalProgress(localProgress);
}

export async function getAllPlaybackProgress(
  _userId?: string | null
): Promise<Map<string, { positionSeconds: number; completed: boolean }>> {
  const progressMap = new Map<string, { positionSeconds: number; completed: boolean }>();

  const localProgress = await getLocalProgress();
  for (const [dreamId, progress] of Object.entries(localProgress)) {
    progressMap.set(dreamId, {
      positionSeconds: progress.positionSeconds,
      completed: progress.completed,
    });
  }

  return progressMap;
}

export async function syncLocalProgressToServer(_userId: string): Promise<void> {
  // No-op for local storage mode
}

export function shouldResumePlayback(positionSeconds: number): boolean {
  return positionSeconds >= PLAYBACK.RESUME_THRESHOLD_SECONDS;
}
