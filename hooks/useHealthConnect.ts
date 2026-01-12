// STUB: Health Connect removed during nuclear reset (Jan 12, 2026)
// Restore from git commit 8f942cb to rebuild Android support

import { useState, useCallback } from 'react';
import {
  runConnectionTest,
  openHealthConnectSettings,
  SUPPORTED_DEVICES,
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
  const isAndroid = false;

  const [status] = useState<HealthConnectStatus>({
    available: false,
    initialized: false,
    permissionsGranted: false,
    sdkStatus: 'unavailable',
  });
  const [vitals] = useState<VitalsSnapshot | null>(null);
  const [recentSleepStages] = useState<SleepStageSample[]>([]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const refreshStatus = useCallback(async () => {}, []);
  const refreshVitals = useCallback(async () => {}, []);
  const initialize = useCallback(async (): Promise<boolean> => false, []);
  const requestPermissions = useCallback(async (): Promise<boolean> => false, []);

  const testConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    setIsTestRunning(true);
    const result = await runConnectionTest();
    setTestResult(result);
    setIsTestRunning(false);
    return result;
  }, []);

  return {
    isAvailable: false,
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
