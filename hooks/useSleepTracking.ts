import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  startSleepSession,
  endSleepSession,
  getCurrentSession,
  updateSleepStage,
  getCurrentStage,
  isInTargetStage,
  onSleepStageChange,
  getSleepHistory,
  calculateSleepSummary,
  startVitalsPolling,
  stopVitalsPolling,
  isVitalsPollingActive,
  getDetectionMode,
  type SleepSession,
  type SleepSummary,
  type SleepTrackingSource,
} from '@/services/sleep';
import type { SleepStage } from '@/types/database';

interface UseSleepTrackingReturn {
  session: SleepSession | null;
  currentStage: SleepStage | null;
  isTracking: boolean;
  isLoading: boolean;
  history: SleepSession[];
  detectionMode: 'audio' | 'vitals' | 'fused' | 'none';
  isVitalsActive: boolean;
  start: (source?: SleepTrackingSource) => Promise<void>;
  stop: () => Promise<SleepSummary | null>;
  setStage: (stage: SleepStage) => void;
  isInTarget: (targetStage: SleepStage) => boolean;
  refresh: () => Promise<void>;
}

export function useSleepTracking(): UseSleepTrackingReturn {
  const [session, setSession] = useState<SleepSession | null>(null);
  const [currentStage, setCurrentStage] = useState<SleepStage | null>(null);
  const [history, setHistory] = useState<SleepSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchState = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activeSession, sleepHistory] = await Promise.all([
        getCurrentSession(),
        getSleepHistory(),
      ]);
      setSession(activeSession);
      setCurrentStage(activeSession?.currentStage || null);
      setHistory(sleepHistory);
    } catch (err) {
      console.warn('Failed to fetch sleep state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    const unsubscribe = onSleepStageChange((stage) => {
      setCurrentStage(stage);
    });
    return unsubscribe;
  }, []);

  const handleStart = useCallback(async (source: SleepTrackingSource = 'manual') => {
    try {
      const newSession = await startSleepSession(source);
      setSession(newSession);

      if (Platform.OS === 'android') {
        startVitalsPolling().catch((err) => console.log('Vitals polling not available:', err));
      }
    } catch (err) {
      console.warn('Failed to start sleep session:', err);
      throw err;
    }
  }, []);

  const handleStop = useCallback(async (): Promise<SleepSummary | null> => {
    try {
      stopVitalsPolling();

      const endedSession = await endSleepSession();
      setSession(null);
      setCurrentStage(null);

      if (endedSession) {
        setHistory((prev) => [endedSession, ...prev]);
        return calculateSleepSummary(endedSession);
      }
      return null;
    } catch (err) {
      console.warn('Failed to end sleep session:', err);
      throw err;
    }
  }, []);

  const handleSetStage = useCallback((stage: SleepStage) => {
    updateSleepStage(stage);
  }, []);

  const checkIsInTarget = useCallback((targetStage: SleepStage): boolean => {
    return isInTargetStage(targetStage);
  }, []);

  return {
    session,
    currentStage,
    isTracking: session?.isActive ?? false,
    isLoading,
    history,
    detectionMode: getDetectionMode(),
    isVitalsActive: isVitalsPollingActive(),
    start: handleStart,
    stop: handleStop,
    setStage: handleSetStage,
    isInTarget: checkIsInTarget,
    refresh: fetchState,
  };
}
