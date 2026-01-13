import { Platform } from 'react-native';

let healthConnect: typeof import('react-native-health-connect') | null = null;

if (Platform.OS === 'android') {
  try {
    healthConnect = require('react-native-health-connect');
  } catch (e) {
    console.warn('Health Connect not available:', e);
  }
}

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

interface PermissionRecord {
  recordType: string;
  accessType: string;
}

const SDK_UNAVAILABLE = 1;
const SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2;
const SDK_AVAILABLE = 3;

const SLEEP_STAGE_MAP: Record<number, SleepStage> = {
  0: 'unknown',
  1: 'awake',
  2: 'light',
  3: 'awake',
  4: 'light',
  5: 'deep',
  6: 'rem',
};

export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return {
      available: false,
      initialized: false,
      permissionsGranted: false,
      sdkStatus: 'unavailable',
    };
  }

  try {
    const status = await healthConnect.getSdkStatus();

    let sdkStatus: HealthConnectStatus['sdkStatus'] = 'unavailable';
    if (status === SDK_AVAILABLE) {
      sdkStatus = 'available';
    } else if (status === SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      sdkStatus = 'installed';
    }

    if (status !== SDK_AVAILABLE) {
      return {
        available: false,
        initialized: false,
        permissionsGranted: false,
        sdkStatus,
      };
    }

    const initialized = await healthConnect.initialize();
    if (!initialized) {
      return {
        available: true,
        initialized: false,
        permissionsGranted: false,
        sdkStatus,
      };
    }

    const permissions = (await checkGrantedPermissions()) as PermissionRecord[];
    const requiredPermissions = ['HeartRate', 'HeartRateVariabilityRmssd', 'SleepSession'];
    const hasAllPermissions = requiredPermissions.every((p) =>
      permissions.some((granted) => granted.recordType === p)
    );

    return {
      available: true,
      initialized: true,
      permissionsGranted: hasAllPermissions,
      sdkStatus,
    };
  } catch (error) {
    console.error('Error getting Health Connect status:', error);
    return {
      available: false,
      initialized: false,
      permissionsGranted: false,
      sdkStatus: 'unavailable',
    };
  }
}

export async function initializeHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return false;
  }

  try {
    const status = await healthConnect.getSdkStatus();
    if (status !== SDK_AVAILABLE) {
      console.log('Health Connect SDK not available, status:', status);
      return false;
    }

    const initialized = await healthConnect.initialize();
    console.log('Health Connect initialized:', initialized);
    return initialized;
  } catch (error) {
    console.error('Failed to initialize Health Connect:', error);
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return false;
  }

  try {
    const grantedPermissions = await healthConnect.requestPermission([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'SleepSession' },
    ]);

    console.log('Granted permissions:', grantedPermissions);

    const requiredTypes = ['HeartRate', 'HeartRateVariabilityRmssd', 'SleepSession'];
    const grantedTypes = grantedPermissions.map((p: PermissionRecord) => p.recordType);
    const allGranted = requiredTypes.every((type) => grantedTypes.includes(type));

    return allGranted;
  } catch (error) {
    console.error('Failed to request permissions:', error);
    return false;
  }
}

export async function checkGrantedPermissions(): Promise<PermissionRecord[]> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return [];
  }

  try {
    const permissions = await healthConnect.getGrantedPermissions();
    return permissions as PermissionRecord[];
  } catch (error) {
    console.error('Failed to check permissions:', error);
    return [];
  }
}

export function openHealthConnectSettings(): void {
  if (Platform.OS !== 'android' || !healthConnect) {
    return;
  }

  try {
    healthConnect.openHealthConnectSettings();
  } catch (error) {
    console.error('Failed to open Health Connect settings:', error);
  }
}

export async function getRecentHeartRate(minutesBack: number = 30): Promise<HeartRateSample[]> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return [];
  }

  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const result = await healthConnect.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
      ascendingOrder: false,
      pageSize: 100,
    });

    const samples: HeartRateSample[] = [];
    for (const record of result.records) {
      if (record.samples) {
        for (const sample of record.samples) {
          samples.push({
            beatsPerMinute: sample.beatsPerMinute,
            time: sample.time,
          });
        }
      }
    }

    samples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return samples;
  } catch (error) {
    console.error('Failed to read heart rate:', error);
    return [];
  }
}

export async function getRecentHRV(minutesBack: number = 30): Promise<HRVSample[]> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return [];
  }

  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const result = await healthConnect.readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
      ascendingOrder: false,
      pageSize: 100,
    });

    const samples: HRVSample[] = result.records.map(
      (record: { heartRateVariabilityMillis: number; time: string }) => ({
        heartRateVariabilityMillis: record.heartRateVariabilityMillis,
        time: record.time,
      })
    );

    samples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return samples;
  } catch (error) {
    console.error('Failed to read HRV:', error);
    return [];
  }
}

export async function getRecentSleepSessions(hoursBack: number = 12): Promise<SleepStageSample[]> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return [];
  }

  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const result = await healthConnect.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
      ascendingOrder: false,
      pageSize: 10,
    });

    const stages: SleepStageSample[] = [];
    for (const record of result.records) {
      if (record.stages) {
        for (const stage of record.stages) {
          stages.push({
            stage: SLEEP_STAGE_MAP[stage.stage] || 'unknown',
            startTime: stage.startTime,
            endTime: stage.endTime,
          });
        }
      }
    }

    stages.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return stages;
  } catch (error) {
    console.error('Failed to read sleep sessions:', error);
    return [];
  }
}

export async function getCurrentVitals(): Promise<VitalsSnapshot> {
  const [hrSamples, hrvSamples] = await Promise.all([getRecentHeartRate(5), getRecentHRV(5)]);

  return {
    heartRate: hrSamples.length > 0 ? hrSamples[0].beatsPerMinute : null,
    hrv: hrvSamples.length > 0 ? hrvSamples[0].heartRateVariabilityMillis : null,
    timestamp: new Date(),
  };
}

export async function runConnectionTest(): Promise<{
  success: boolean;
  steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }>;
}> {
  const steps: Array<{ name: string; passed: boolean; error?: string; detail?: string }> = [];

  if (Platform.OS !== 'android') {
    steps.push({
      name: 'Platform Check',
      passed: false,
      error: 'Health Connect is only available on Android',
    });
    return { success: false, steps };
  }
  steps.push({ name: 'Platform Check', passed: true, detail: 'Running on Android' });

  if (!healthConnect) {
    steps.push({
      name: 'Library Check',
      passed: false,
      error: 'react-native-health-connect not loaded',
    });
    return { success: false, steps };
  }
  steps.push({ name: 'Library Check', passed: true, detail: 'Library loaded' });

  try {
    const status = await healthConnect.getSdkStatus();
    if (status === SDK_AVAILABLE) {
      steps.push({ name: 'SDK Status', passed: true, detail: 'Health Connect SDK available' });
    } else if (status === SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      steps.push({
        name: 'SDK Status',
        passed: false,
        error: 'Health Connect needs update',
        detail: 'Please update Health Connect from Play Store',
      });
      return { success: false, steps };
    } else {
      steps.push({
        name: 'SDK Status',
        passed: false,
        error: 'Health Connect not installed',
        detail: 'Please install Health Connect from Play Store',
      });
      return { success: false, steps };
    }
  } catch (error) {
    steps.push({
      name: 'SDK Status',
      passed: false,
      error: `Failed to check SDK: ${error}`,
    });
    return { success: false, steps };
  }

  try {
    const initialized = await healthConnect.initialize();
    if (initialized) {
      steps.push({ name: 'Initialize', passed: true, detail: 'Client initialized' });
    } else {
      steps.push({
        name: 'Initialize',
        passed: false,
        error: 'Failed to initialize client',
      });
      return { success: false, steps };
    }
  } catch (error) {
    steps.push({
      name: 'Initialize',
      passed: false,
      error: `Initialization error: ${error}`,
    });
    return { success: false, steps };
  }

  try {
    const permissions = await healthConnect.getGrantedPermissions();
    const grantedTypes = (permissions as PermissionRecord[]).map((p) => p.recordType);
    const requiredTypes = ['HeartRate', 'HeartRateVariabilityRmssd', 'SleepSession'];
    const allGranted = requiredTypes.every((type) => grantedTypes.includes(type));

    if (allGranted) {
      steps.push({
        name: 'Permissions',
        passed: true,
        detail: `Granted: ${grantedTypes.join(', ')}`,
      });
    } else {
      const missing = requiredTypes.filter((type) => !grantedTypes.includes(type));
      steps.push({
        name: 'Permissions',
        passed: false,
        error: `Missing permissions: ${missing.join(', ')}`,
        detail: `Granted: ${grantedTypes.join(', ') || 'none'}. Use "Request Permissions" first.`,
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

export const SUPPORTED_DEVICES = [
  {
    name: 'Google Pixel Watch',
    manufacturer: 'Google',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Native Health Connect support',
  },
  {
    name: 'Samsung Galaxy Watch',
    manufacturer: 'Samsung',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Via Samsung Health sync',
  },
  {
    name: 'Fitbit Trackers',
    manufacturer: 'Fitbit',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Via Fitbit app sync to Health Connect',
  },
  {
    name: 'Fossil Gen 6',
    manufacturer: 'Fossil',
    features: ['Heart Rate', 'Sleep Stages'],
    notes: 'With Wear OS 3+ update',
  },
  {
    name: 'TicWatch Pro 5',
    manufacturer: 'Mobvoi',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Native Health Connect support',
  },
];
