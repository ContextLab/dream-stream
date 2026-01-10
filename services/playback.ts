import { supabase } from './supabase';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS, PLAYBACK } from '@/lib/constants';
import type { PlaybackProgress } from '@/types/database';

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
  userId?: string | null
): Promise<{ positionSeconds: number; completed: boolean } | null> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('playback_progress')
        .select('position_seconds, completed')
        .eq('dream_id', dreamId)
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return {
          positionSeconds: data.position_seconds,
          completed: data.completed,
        };
      }
    } catch {}
  }

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
  userId?: string | null
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

  if (userId) {
    try {
      await supabase
        .from('playback_progress')
        .upsert(
          {
            user_id: userId,
            dream_id: dreamId,
            position_seconds: positionSeconds,
            completed,
            updated_at: now,
          },
          {
            onConflict: 'user_id,dream_id',
          }
        );
    } catch (err) {
      console.warn('Failed to save progress to server:', err);
    }
  }
}

export async function clearPlaybackProgress(
  dreamId: string,
  userId?: string | null
): Promise<void> {
  const localProgress = await getLocalProgress();
  delete localProgress[dreamId];
  await setLocalProgress(localProgress);

  if (userId) {
    try {
      await supabase
        .from('playback_progress')
        .delete()
        .eq('dream_id', dreamId)
        .eq('user_id', userId);
    } catch {}
  }
}

export async function getAllPlaybackProgress(
  userId?: string | null
): Promise<Map<string, { positionSeconds: number; completed: boolean }>> {
  const progressMap = new Map<string, { positionSeconds: number; completed: boolean }>();

  const localProgress = await getLocalProgress();
  for (const [dreamId, progress] of Object.entries(localProgress)) {
    progressMap.set(dreamId, {
      positionSeconds: progress.positionSeconds,
      completed: progress.completed,
    });
  }

  if (userId) {
    try {
      const { data } = await supabase
        .from('playback_progress')
        .select('dream_id, position_seconds, completed')
        .eq('user_id', userId);

      if (data) {
        for (const item of data) {
          progressMap.set(item.dream_id, {
            positionSeconds: item.position_seconds,
            completed: item.completed,
          });
        }
      }
    } catch {}
  }

  return progressMap;
}

export async function syncLocalProgressToServer(userId: string): Promise<void> {
  const localProgress = await getLocalProgress();
  const entries = Object.entries(localProgress);

  if (entries.length === 0) return;

  try {
    const records = entries.map(([dreamId, progress]) => ({
      user_id: userId,
      dream_id: dreamId,
      position_seconds: progress.positionSeconds,
      completed: progress.completed,
      updated_at: progress.updatedAt,
    }));

    await supabase.from('playback_progress').upsert(records, {
      onConflict: 'user_id,dream_id',
    });

    await setLocalProgress({});
  } catch (err) {
    console.warn('Failed to sync progress to server:', err);
  }
}

export function shouldResumePlayback(positionSeconds: number): boolean {
  return positionSeconds >= PLAYBACK.RESUME_THRESHOLD_SECONDS;
}
