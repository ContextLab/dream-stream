import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  runConnectionTest,
  openHealthConnectSettings,
  SUPPORTED_DEVICES,
  getHealthConnectStatus,
  initializeHealthConnect,
  requestHealthPermissions,
  getCurrentVitals,
  getRecentSleepSessions,
  type HealthConnectStatus,
  type VitalsSnapshot,
  type SleepStageSample,
} from '@/services/healthConnect';

interface ConnectionTestResult {
  success: boolean;
  steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }>;
}

interface UseHealthConnectReturn {
  isAvailable: boolean;
  isAndroid: boolean;
  status: HealthConnectStatus | null;
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
  supportedDevices: typeof SUPPORTED_DEVICES;
  openSettings: () => void;
}

export function useHealthConnect(): UseHealthConnectReturn {
  const isAndroid = Platform.OS === 'android';

  const [status, setStatus] = useState<HealthConnectStatus | null>(null);
  const [vitals, setVitals] = useState<VitalsSnapshot | null>(null);
  const [recentSleepStages, setRecentSleepStages] = useState<SleepStageSample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isAndroid) return;

    setIsLoading(true);
    setError(null);
    try {
      const newStatus = await getHealthConnectStatus();
      setStatus(newStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get status');
    } finally {
      setIsLoading(false);
    }
  }, [isAndroid]);

  const refreshVitals = useCallback(async () => {
    if (!isAndroid || !status?.permissionsGranted) return;

    try {
      const [newVitals, sleepStages] = await Promise.all([
        getCurrentVitals(),
        getRecentSleepSessions(12),
      ]);
      setVitals(newVitals);
      setRecentSleepStages(sleepStages);
    } catch (e) {
      console.error('Failed to refresh vitals:', e);
    }
  }, [isAndroid, status?.permissionsGranted]);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (!isAndroid) return false;

    setIsLoading(true);
    setError(null);
    try {
      const success = await initializeHealthConnect();
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
  }, [isAndroid, refreshStatus]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAndroid) return false;

    setIsLoading(true);
    setError(null);
    try {
      const success = await requestHealthPermissions();
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
  }, [isAndroid, refreshStatus, refreshVitals]);

  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    setIsTestRunning(true);
    setTestResult(null);
    try {
      const result = await runConnectionTest();
      setTestResult(result);
      if (result.success) {
        await refreshStatus();
        await refreshVitals();
      }
      return result;
    } finally {
      setIsTestRunning(false);
    }
  }, [refreshStatus, refreshVitals]);

  useEffect(() => {
    if (isAndroid) {
      refreshStatus();
    }
  }, [isAndroid, refreshStatus]);

  useEffect(() => {
    if (status?.permissionsGranted) {
      refreshVitals();
    }
  }, [status?.permissionsGranted, refreshVitals]);

  return {
    isAvailable: status?.available ?? false,
    isAndroid,
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
    supportedDevices: SUPPORTED_DEVICES,
    openSettings: openHealthConnectSettings,
  };
}
