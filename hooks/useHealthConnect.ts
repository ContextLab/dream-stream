import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  getHealthConnectStatus,
  initializeHealthConnect,
  requestHealthPermissions,
  getCurrentVitals,
  runConnectionTest,
  getRecentSleepSessions,
  openHealthConnectSettings,
  SUPPORTED_DEVICES,
  type HealthConnectStatus,
  type VitalsSnapshot,
  type SleepStageSample,
} from '@/services/healthConnect';
import { processVitalsUpdate, enableVitalsDetection } from '@/services/sleep';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!isAndroid) {
      setStatus({
        available: false,
        initialized: false,
        permissionsGranted: false,
        sdkStatus: 'unavailable',
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newStatus = await getHealthConnectStatus();
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get Health Connect status');
    } finally {
      setIsLoading(false);
    }
  }, [isAndroid]);

  const refreshVitals = useCallback(async () => {
    if (!isAndroid || !status?.initialized) return;

    try {
      const [newVitals, sleepStages] = await Promise.all([
        getCurrentVitals(),
        getRecentSleepSessions(12),
      ]);
      setVitals(newVitals);
      setRecentSleepStages(sleepStages);

      if (newVitals.heartRate !== null || newVitals.hrv !== null) {
        processVitalsUpdate(newVitals);
      }
    } catch (err) {
      console.error('Failed to refresh vitals:', err);
    }
  }, [isAndroid, status?.initialized]);

  const initialize = useCallback(async (): Promise<boolean> => {
    if (!isAndroid) return false;

    setError(null);
    try {
      const result = await initializeHealthConnect();
      await refreshStatus();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Health Connect');
      return false;
    }
  }, [isAndroid, refreshStatus]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAndroid) return false;

    setError(null);
    try {
      const result = await requestHealthPermissions();
      await refreshStatus();
      if (result) {
        await refreshVitals();
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permissions');
      return false;
    }
  }, [isAndroid, refreshStatus, refreshVitals]);

  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    setIsTestRunning(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await runConnectionTest();
      setTestResult(result);
      return result;
    } catch (err) {
      const failedResult: ConnectionTestResult = {
        success: false,
        steps: [
          {
            name: 'Connection Test',
            passed: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        ],
      };
      setTestResult(failedResult);
      return failedResult;
    } finally {
      setIsTestRunning(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!status?.initialized) {
      enableVitalsDetection(false);
      return;
    }

    enableVitalsDetection(true);
    refreshVitals();
    const interval = setInterval(refreshVitals, 30000);
    return () => {
      clearInterval(interval);
      enableVitalsDetection(false);
    };
  }, [status?.initialized, refreshVitals]);

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
