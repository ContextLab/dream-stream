import { storage } from '@/lib/storage';
import type { SleepStage } from '@/types/database';

const STORAGE_KEY_SLEEP_SESSION = 'sleep_session';
const STORAGE_KEY_SLEEP_HISTORY = 'sleep_history';

export interface SleepSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  currentStage: SleepStage | null;
  stageHistory: SleepStageEntry[];
}

export interface SleepStageEntry {
  stage: SleepStage;
  timestamp: string;
  durationSeconds: number;
}

export interface SleepSummary {
  totalDurationMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  awakeMinutes: number;
  remPercentage: number;
}

export type SleepTrackingSource = 'wearable' | 'manual' | 'healthkit';

let currentSession: SleepSession | null = null;
let stageListeners: Array<(stage: SleepStage | null) => void> = [];

function generateSessionId(): string {
  return `sleep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function startSleepSession(source: SleepTrackingSource): Promise<SleepSession> {
  const session: SleepSession = {
    id: generateSessionId(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    isActive: true,
    currentStage: null,
    stageHistory: [],
  };

  currentSession = session;
  await storage.set(STORAGE_KEY_SLEEP_SESSION, session);

  return session;
}

export async function endSleepSession(): Promise<SleepSession | null> {
  if (!currentSession) {
    return null;
  }

  currentSession.endedAt = new Date().toISOString();
  currentSession.isActive = false;

  await saveSleepSessionToHistory(currentSession);
  await storage.remove(STORAGE_KEY_SLEEP_SESSION);

  const session = currentSession;
  currentSession = null;
  notifyStageListeners(null);

  return session;
}

export async function getCurrentSession(): Promise<SleepSession | null> {
  if (currentSession) {
    return currentSession;
  }

  const stored = await storage.get<SleepSession>(STORAGE_KEY_SLEEP_SESSION);
  if (stored?.isActive) {
    currentSession = stored;
    return stored;
  }

  return null;
}

export function updateSleepStage(stage: SleepStage): void {
  if (!currentSession) {
    return;
  }

  const now = new Date().toISOString();
  const lastEntry = currentSession.stageHistory[currentSession.stageHistory.length - 1];

  if (lastEntry) {
    const lastTimestamp = new Date(lastEntry.timestamp).getTime();
    const nowTimestamp = new Date(now).getTime();
    lastEntry.durationSeconds = Math.floor((nowTimestamp - lastTimestamp) / 1000);
  }

  currentSession.stageHistory.push({
    stage,
    timestamp: now,
    durationSeconds: 0,
  });

  currentSession.currentStage = stage;
  notifyStageListeners(stage);

  storage.set(STORAGE_KEY_SLEEP_SESSION, currentSession);
}

export function getCurrentStage(): SleepStage | null {
  return currentSession?.currentStage || null;
}

export function isInTargetStage(targetStage: SleepStage): boolean {
  if (!currentSession?.currentStage) {
    return false;
  }

  if (targetStage === 'any') {
    return currentSession.currentStage !== 'awake';
  }

  return currentSession.currentStage === targetStage;
}

export function onSleepStageChange(listener: (stage: SleepStage | null) => void): () => void {
  stageListeners.push(listener);
  return () => {
    stageListeners = stageListeners.filter((l) => l !== listener);
  };
}

function notifyStageListeners(stage: SleepStage | null): void {
  stageListeners.forEach((listener) => listener(stage));
}

async function saveSleepSessionToHistory(session: SleepSession): Promise<void> {
  const history = await getSleepHistory();
  history.unshift(session);
  
  const MAX_HISTORY = 30;
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  await storage.set(STORAGE_KEY_SLEEP_HISTORY, history);
}

export async function getSleepHistory(): Promise<SleepSession[]> {
  const history = await storage.get<SleepSession[]>(STORAGE_KEY_SLEEP_HISTORY);
  return history || [];
}

export function calculateSleepSummary(session: SleepSession): SleepSummary {
  let remSeconds = 0;
  let lightSeconds = 0;
  let deepSeconds = 0;
  let awakeSeconds = 0;

  for (const entry of session.stageHistory) {
    switch (entry.stage) {
      case 'rem':
        remSeconds += entry.durationSeconds;
        break;
      case 'light':
        lightSeconds += entry.durationSeconds;
        break;
      case 'deep':
        deepSeconds += entry.durationSeconds;
        break;
      case 'awake':
        awakeSeconds += entry.durationSeconds;
        break;
    }
  }

  const totalSeconds = remSeconds + lightSeconds + deepSeconds + awakeSeconds;
  const totalMinutes = Math.round(totalSeconds / 60);

  return {
    totalDurationMinutes: totalMinutes,
    remMinutes: Math.round(remSeconds / 60),
    lightMinutes: Math.round(lightSeconds / 60),
    deepMinutes: Math.round(deepSeconds / 60),
    awakeMinutes: Math.round(awakeSeconds / 60),
    remPercentage: totalSeconds > 0 ? Math.round((remSeconds / totalSeconds) * 100) : 0,
  };
}

export function getSleepStageDisplayName(stage: SleepStage): string {
  const names: Record<SleepStage, string> = {
    rem: 'REM Sleep',
    light: 'Light Sleep',
    deep: 'Deep Sleep',
    awake: 'Awake',
    any: 'Any Stage',
  };
  return names[stage];
}

export function getSleepStageColor(stage: SleepStage): string {
  const colors: Record<SleepStage, string> = {
    rem: '#8b5cf6',
    light: '#60a5fa',
    deep: '#3b82f6',
    awake: '#fbbf24',
    any: '#6b7280',
  };
  return colors[stage];
}
