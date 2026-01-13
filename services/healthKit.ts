import { Platform } from 'react-native';

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

export interface HealthKitStatus {
  available: boolean;
  initialized: boolean;
  permissionsGranted: boolean;
}

export interface VitalsSnapshot {
  heartRate: number | null;
  hrv: number | null;
  timestamp: Date;
}

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

let healthKit: HealthKitModule | null = null;

if (Platform.OS === 'ios') {
  try {
    healthKit = require('@kingstinct/react-native-healthkit');
  } catch (e) {
    console.warn('HealthKit not available:', e);
  }
}

const HEART_RATE_TYPE = 'HKQuantityTypeIdentifierHeartRate' as const;
const HRV_TYPE = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN' as const;
const SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis' as const;

// HealthKit sleep values: 0=inBed, 1=unspecified, 2=awake, 3=core, 4=deep, 5=REM
const HEALTHKIT_SLEEP_STAGE_MAP: Record<number, SleepStage> = {
  0: 'awake',
  1: 'light',
  2: 'awake',
  3: 'light',
  4: 'deep',
  5: 'rem',
};

export async function getHealthKitStatus(): Promise<HealthKitStatus> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return {
      available: false,
      initialized: false,
      permissionsGranted: false,
    };
  }

  try {
    const available = healthKit.isHealthDataAvailable();
    if (!available) {
      return {
        available: false,
        initialized: false,
        permissionsGranted: false,
      };
    }

    const hrStatus = healthKit.authorizationStatusFor(HEART_RATE_TYPE);
    const hrvStatus = healthKit.authorizationStatusFor(HRV_TYPE);
    const sleepStatus = healthKit.authorizationStatusFor(SLEEP_TYPE);

    const { AuthorizationStatus } = healthKit;
    const hasPermissions =
      hrStatus === AuthorizationStatus.sharingAuthorized ||
      hrvStatus === AuthorizationStatus.sharingAuthorized ||
      sleepStatus === AuthorizationStatus.sharingAuthorized;

    return {
      available: true,
      initialized: true,
      permissionsGranted: hasPermissions,
    };
  } catch (error) {
    console.error('Error getting HealthKit status:', error);
    return {
      available: false,
      initialized: false,
      permissionsGranted: false,
    };
  }
}

export async function initializeHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return false;
  }

  try {
    const available = healthKit.isHealthDataAvailable();
    return available;
  } catch (error) {
    console.error('Failed to initialize HealthKit:', error);
    return false;
  }
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return false;
  }

  try {
    await healthKit.requestAuthorization({
      toRead: [HEART_RATE_TYPE, HRV_TYPE, SLEEP_TYPE],
    });

    const status = await getHealthKitStatus();
    return status.permissionsGranted;
  } catch (error) {
    console.error('Failed to request HealthKit permissions:', error);
    return false;
  }
}

export async function getRecentHeartRate(minutesBack: number = 30): Promise<HeartRateSample[]> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return [];
  }

  try {
    const endDate = new Date();
    const startDate = new Date(Date.now() - minutesBack * 60 * 1000);

    const samples = await healthKit.queryQuantitySamples(HEART_RATE_TYPE, {
      filter: { date: { startDate, endDate } },
      limit: 100,
      ascending: false,
    });

    return samples.map((sample) => ({
      beatsPerMinute: sample.quantity,
      time: sample.startDate.toISOString(),
    }));
  } catch (error) {
    console.error('Failed to read heart rate:', error);
    return [];
  }
}

export async function getRecentHRV(minutesBack: number = 30): Promise<HRVSample[]> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return [];
  }

  try {
    const endDate = new Date();
    const startDate = new Date(Date.now() - minutesBack * 60 * 1000);

    const samples = await healthKit.queryQuantitySamples(HRV_TYPE, {
      filter: { date: { startDate, endDate } },
      limit: 100,
      ascending: false,
    });

    return samples.map((sample) => ({
      heartRateVariabilityMillis: sample.quantity,
      time: sample.startDate.toISOString(),
    }));
  } catch (error) {
    console.error('Failed to read HRV:', error);
    return [];
  }
}

export async function getRecentSleepSessions(hoursBack: number = 12): Promise<SleepStageSample[]> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return [];
  }

  try {
    const endDate = new Date();
    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const samples = await healthKit.queryCategorySamples(SLEEP_TYPE, {
      filter: { date: { startDate, endDate } },
      limit: 100,
      ascending: false,
    });

    return samples.map((sample) => ({
      stage: HEALTHKIT_SLEEP_STAGE_MAP[sample.value] || 'unknown',
      startTime: sample.startDate.toISOString(),
      endTime: sample.endDate.toISOString(),
    }));
  } catch (error) {
    console.error('Failed to read sleep sessions:', error);
    return [];
  }
}

export async function getCurrentVitals(): Promise<VitalsSnapshot> {
  const [hrSamples, hrvSamples] = await Promise.all([getRecentHeartRate(60), getRecentHRV(60)]);

  return {
    heartRate: hrSamples.length > 0 ? hrSamples[0].beatsPerMinute : null,
    hrv: hrvSamples.length > 0 ? hrvSamples[0].heartRateVariabilityMillis : null,
    timestamp: new Date(),
  };
}

export function subscribeToHeartRate(callback: (sample: HeartRateSample) => void): () => void {
  if (Platform.OS !== 'ios' || !healthKit) {
    return () => {};
  }

  try {
    const subscription = healthKit.subscribeToChanges(HEART_RATE_TYPE, async () => {
      const samples = await getRecentHeartRate(1);
      if (samples.length > 0) {
        callback(samples[0]);
      }
    });

    return () => subscription.remove();
  } catch (error) {
    console.error('Failed to subscribe to heart rate:', error);
    return () => {};
  }
}

export async function enableBackgroundDelivery(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !healthKit) {
    return false;
  }

  try {
    const { UpdateFrequency } = healthKit;
    await healthKit.enableBackgroundDelivery(HEART_RATE_TYPE, UpdateFrequency.immediate);
    return true;
  } catch (error) {
    console.error('Failed to enable background delivery:', error);
    return false;
  }
}

export async function runConnectionTest(): Promise<{
  success: boolean;
  steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }>;
}> {
  const steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }> = [];

  if (Platform.OS !== 'ios') {
    steps.push({
      name: 'Platform Check',
      passed: false,
      error: 'HealthKit is only available on iOS',
    });
    return { success: false, steps };
  }
  steps.push({ name: 'Platform Check', passed: true, detail: 'Running on iOS' });

  if (!healthKit) {
    steps.push({
      name: 'Library Check',
      passed: false,
      error: '@kingstinct/react-native-healthkit not loaded',
    });
    return { success: false, steps };
  }
  steps.push({ name: 'Library Check', passed: true, detail: 'Library loaded' });

  try {
    const available = healthKit.isHealthDataAvailable();
    if (available) {
      steps.push({ name: 'HealthKit Available', passed: true, detail: 'HealthKit is available' });
    } else {
      steps.push({
        name: 'HealthKit Available',
        passed: false,
        error: 'HealthKit not available on this device',
      });
      return { success: false, steps };
    }
  } catch (error) {
    steps.push({
      name: 'HealthKit Available',
      passed: false,
      error: `Failed to check availability: ${error}`,
    });
    return { success: false, steps };
  }

  try {
    const status = await getHealthKitStatus();
    if (status.permissionsGranted) {
      steps.push({
        name: 'Permissions',
        passed: true,
        detail: 'Health data permissions granted',
      });
    } else {
      steps.push({
        name: 'Permissions',
        passed: false,
        error: 'Permissions not granted',
        detail: 'Use "Request Permissions" to grant access',
      });
      return { success: false, steps };
    }
  } catch (error) {
    steps.push({
      name: 'Permissions',
      passed: false,
      error: `Permission check error: ${error}`,
    });
    return { success: false, steps };
  }

  try {
    const hrSamples = await getRecentHeartRate(60);
    steps.push({
      name: 'Read Heart Rate',
      passed: true,
      detail: `Found ${hrSamples.length} samples in last hour`,
    });
  } catch (error) {
    steps.push({
      name: 'Read Heart Rate',
      passed: false,
      error: `Read error: ${error}`,
    });
  }

  return {
    success: steps.every((s) => s.passed),
    steps,
  };
}

export function openHealthSettings(): void {
  if (Platform.OS !== 'ios') {
    return;
  }
  console.log('To manage HealthKit permissions, go to Settings > Privacy & Security > Health');
}

export const SUPPORTED_DEVICES = [
  {
    name: 'Apple Watch',
    manufacturer: 'Apple',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Native HealthKit support with real-time data',
  },
  {
    name: 'Apple Watch Ultra',
    manufacturer: 'Apple',
    features: ['Heart Rate', 'HRV', 'Sleep Stages', 'Temperature'],
    notes: 'Enhanced sensors for sleep tracking',
  },
  {
    name: 'Oura Ring (via Health)',
    manufacturer: 'Oura',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Syncs to HealthKit via Oura app',
  },
  {
    name: 'Whoop (via Health)',
    manufacturer: 'Whoop',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Syncs to HealthKit via Whoop app',
  },
  {
    name: 'Fitbit (via Health)',
    manufacturer: 'Fitbit',
    features: ['Heart Rate', 'Sleep'],
    notes: 'Limited HealthKit sync via third-party apps',
  },
];
