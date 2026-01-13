import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import * as healthConnect from '@/services/healthConnect';
import * as healthKit from '@/services/healthKit';

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'unknown';

export interface HeartRateSample {
  beatsPerMinute: number;
  time: string;
}

export interface HRVSample {
  heartRateVariabilityMillis: number;
  time: string;
}

export interface SleepStageSample {
  stage: SleepStage;
  startTime: string;
  endTime: string;
}

export interface HealthStatus {
  available: boolean;
  initialized: boolean;
  permissionsGranted: boolean;
}

export interface VitalsSnapshot {
  heartRate: number | null;
  hrv: number | null;
  timestamp: Date;
}

interface ConnectionTestResult {
  success: boolean;
  steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }>;
}

interface SupportedDevice {
  name: string;
  manufacturer: string;
  features: string[];
  notes: string;
}

interface UseHealthReturn {
  platform: 'ios' | 'android' | 'other';
  isAvailable: boolean;
  status: HealthStatus | null;
  isLoading: boolean;
  error: string | null;
  vitals: VitalsSnapshot | null;
  recentSleepStages: SleepStageSample[];
  initialize: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  refreshVitals: () => Promise<void>;
  testConnection: () => Promise<ConnectionTestResult>;
  isTestRunning: boolean;
  testResult: ConnectionTestResult | null;
  supportedDevices: SupportedDevice[];
  openSettings: () => void;
  startVitalsPolling: () => void;
  stopVitalsPolling: () => void;
  isPolling: boolean;
}

export function useHealth(): UseHealthReturn {
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'other';

  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [vitals, setVitals] = useState<VitalsSnapshot | null>(null);
  const [recentSleepStages, setRecentSleepStages] = useState<SleepStageSample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const POLLING_INTERVAL_MS = 10000;

  const refreshStatus = useCallback(async () => {
    if (platform === 'other') return;

    setIsLoading(true);
    setError(null);
    try {
      const newStatus =
        platform === 'ios'
          ? await healthKit.getHealthKitStatus()
          : await healthConnect.getHealthConnectStatus();

      setStatus({
        available: newStatus.available,
        initialized: newStatus.initialized,
        permissionsGranted: newStatus.permissionsGranted,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get status');
    } finally {
      setIsLoading(false);
    }
  }, [platform]);

  const refreshVitals = useCallback(async () => {
    if (platform === 'other') return;

    try {
      const currentStatus =
        platform === 'ios'
          ? await healthKit.getHealthKitStatus()
          : await healthConnect.getHealthConnectStatus();

      if (!currentStatus.permissionsGranted) {
        return;
      }

      const [newVitals, sleepStages] = await Promise.all([
        platform === 'ios' ? healthKit.getCurrentVitals() : healthConnect.getCurrentVitals(),
        platform === 'ios'
          ? healthKit.getRecentSleepSessions(12)
          : healthConnect.getRecentSleepSessions(12),
      ]);

      setVitals(newVitals);
      setRecentSleepStages(sleepStages);
    } catch (e) {
      console.error('Failed to refresh vitals:', e);
    }
  }, [platform]);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (platform === 'other') return false;

    setIsLoading(true);
    setError(null);
    try {
      const success =
        platform === 'ios'
          ? await healthKit.initializeHealthKit()
          : await healthConnect.initializeHealthConnect();

      if (success) {
        await refreshStatus();
      }
      return success;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Initialization failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [platform, refreshStatus]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (platform === 'other') return false;

    setIsLoading(true);
    setError(null);
    try {
      const success =
        platform === 'ios'
          ? await healthKit.requestHealthKitPermissions()
          : await healthConnect.requestHealthPermissions();

      await refreshStatus();
      if (success) {
        await refreshVitals();
      }
      return success;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Permission request failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [platform, refreshStatus, refreshVitals]);

  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    setIsTestRunning(true);
    setTestResult(null);
    try {
      const result =
        platform === 'ios'
          ? await healthKit.runConnectionTest()
          : await healthConnect.runConnectionTest();

      setTestResult(result);
      if (result.success) {
        await refreshStatus();
        await refreshVitals();
      }
      return result;
    } finally {
      setIsTestRunning(false);
    }
  }, [platform, refreshStatus, refreshVitals]);

  const openSettings = useCallback(() => {
    if (platform === 'ios') {
      healthKit.openHealthSettings();
    } else if (platform === 'android') {
      healthConnect.openHealthConnectSettings();
    }
  }, [platform]);

  const startVitalsPolling = useCallback(() => {
    if (pollingIntervalRef.current || platform === 'other') return;

    setIsPolling(true);
    refreshVitals();

    pollingIntervalRef.current = setInterval(() => {
      refreshVitals();
    }, POLLING_INTERVAL_MS);
  }, [platform, refreshVitals]);

  const stopVitalsPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (platform !== 'other') {
      refreshStatus();
    }
  }, [platform, refreshStatus]);

  useEffect(() => {
    if (status?.permissionsGranted) {
      refreshVitals();
    }
  }, [status?.permissionsGranted, refreshVitals]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const supportedDevices =
    platform === 'ios' ? healthKit.SUPPORTED_DEVICES : healthConnect.SUPPORTED_DEVICES;

  return {
    platform,
    isAvailable: status?.available ?? false,
    status,
    isLoading,
    error,
    vitals,
    recentSleepStages,
    initialize,
    requestPermissions,
    refreshStatus,
    refreshVitals,
    testConnection,
    isTestRunning,
    testResult,
    supportedDevices,
    openSettings,
    startVitalsPolling,
    stopVitalsPolling,
    isPolling,
  };
}
