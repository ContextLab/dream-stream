// STUB: Health Connect removed during nuclear reset (Jan 12, 2026)
// Restore from git commit 8f942cb to rebuild Android support

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

export interface HealthConnectStatus {
  available: boolean;
  initialized: boolean;
  permissionsGranted: boolean;
  sdkStatus: 'unavailable' | 'installed' | 'available';
}

export interface VitalsSnapshot {
  heartRate: number | null;
  hrv: number | null;
  timestamp: Date;
}

export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  return {
    available: false,
    initialized: false,
    permissionsGranted: false,
    sdkStatus: 'unavailable',
  };
}

export async function initializeHealthConnect(): Promise<boolean> {
  return false;
}

export async function requestHealthPermissions(): Promise<boolean> {
  return false;
}

export async function checkGrantedPermissions(): Promise<unknown[]> {
  return [];
}

export function openHealthConnectSettings(): void {}

export async function getRecentHeartRate(_minutesBack: number = 30): Promise<HeartRateSample[]> {
  return [];
}

export async function getRecentHRV(_minutesBack: number = 30): Promise<HRVSample[]> {
  return [];
}

export async function getRecentSleepSessions(_hoursBack: number = 12): Promise<SleepStageSample[]> {
  return [];
}

export async function getCurrentVitals(): Promise<VitalsSnapshot> {
  return {
    heartRate: null,
    hrv: null,
    timestamp: new Date(),
  };
}

export async function runConnectionTest(): Promise<{
  success: boolean;
  steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }>;
}> {
  return {
    success: false,
    steps: [
      {
        name: 'Health Connect SDK',
        passed: false,
        error: 'Health Connect is only available on Android',
      },
    ],
  };
}

export const SUPPORTED_DEVICES = [
  {
    name: 'Google Pixel Watch',
    manufacturer: 'Google',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Requires Android with Health Connect',
  },
  {
    name: 'Samsung Galaxy Watch',
    manufacturer: 'Samsung',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Requires Android with Health Connect',
  },
];
