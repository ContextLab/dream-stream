import { supabase } from './supabase';
import { storage } from '@/lib/storage';
import type { DreamLaunchQueue, LaunchStatus, TriggerMode, SleepStage, Dream } from '@/types/database';

const STORAGE_KEY_QUEUE = 'dream_launch_queue';

export interface QueuedDream extends DreamLaunchQueue {
  dream: Dream;
}

export async function getQueuedDreams(userId: string): Promise<QueuedDream[]> {
  try {
    const { data, error } = await supabase
      .from('dream_launch_queue')
      .select(`
        *,
        dream:dreams(*)
      `)
      .eq('user_id', userId)
      .in('status', ['pending', 'ready'])
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Error fetching queued dreams:', error.message);
      return [];
    }

    return (data || []) as QueuedDream[];
  } catch {
    return [];
  }
}

export async function getActiveQueueItem(userId: string): Promise<QueuedDream | null> {
  try {
    const { data, error } = await supabase
      .from('dream_launch_queue')
      .select(`
        *,
        dream:dreams(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'ready')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data as QueuedDream;
  } catch {
    return null;
  }
}

export async function addToQueue(
  userId: string,
  dreamId: string,
  triggerMode: TriggerMode = 'auto',
  targetSleepStage: SleepStage = 'rem'
): Promise<DreamLaunchQueue> {
  const existing = await supabase
    .from('dream_launch_queue')
    .select('id')
    .eq('user_id', userId)
    .eq('dream_id', dreamId)
    .in('status', ['pending', 'ready'])
    .single();

  if (existing.data) {
    throw new Error('This dream is already in your queue');
  }

  const { data, error } = await supabase
    .from('dream_launch_queue')
    .insert({
      user_id: userId,
      dream_id: dreamId,
      status: 'pending',
      trigger_mode: triggerMode,
      target_sleep_stage: targetSleepStage,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add dream to queue: ${error.message}`);
  }

  return data as DreamLaunchQueue;
}

export async function removeFromQueue(queueId: string): Promise<void> {
  const { error } = await supabase
    .from('dream_launch_queue')
    .delete()
    .eq('id', queueId);

  if (error) {
    throw new Error(`Failed to remove from queue: ${error.message}`);
  }
}

export async function updateQueueStatus(
  queueId: string,
  status: LaunchStatus
): Promise<DreamLaunchQueue> {
  const updates: Partial<DreamLaunchQueue> = { status };

  if (status === 'launched') {
    updates.launched_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('dream_launch_queue')
    .update(updates)
    .eq('id', queueId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update queue status: ${error.message}`);
  }

  return data as DreamLaunchQueue;
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
  const { error } = await supabase
    .from('dream_launch_queue')
    .delete()
    .eq('user_id', userId)
    .in('status', ['pending', 'ready']);

  if (error) {
    throw new Error(`Failed to clear queue: ${error.message}`);
  }
}

export async function isInQueue(userId: string, dreamId: string): Promise<boolean> {
  const { data } = await supabase
    .from('dream_launch_queue')
    .select('id')
    .eq('user_id', userId)
    .eq('dream_id', dreamId)
    .in('status', ['pending', 'ready'])
    .single();

  return !!data;
}

export async function getQueueHistory(
  userId: string,
  limit: number = 10
): Promise<QueuedDream[]> {
  try {
    const { data, error } = await supabase
      .from('dream_launch_queue')
      .select(`
        *,
        dream:dreams(*)
      `)
      .eq('user_id', userId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return [];
    }

    return (data || []) as QueuedDream[];
  } catch {
    return [];
  }
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
