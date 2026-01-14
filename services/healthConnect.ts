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
  respiratoryRate: number | null;
  timestamp: Date;
}

export interface RespiratoryRateSample {
  rate: number;
  time: string;
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

    const allSamples: HeartRateSample[] = [];
    let pageToken: string | undefined;

    do {
      const result = await healthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
        ascendingOrder: false,
        pageSize: 1000,
        pageToken,
      });

      for (const record of result.records) {
        if (record.samples) {
          for (const sample of record.samples) {
            allSamples.push({
              beatsPerMinute: sample.beatsPerMinute,
              time: sample.time,
            });
          }
        }
      }

      pageToken = result.pageToken;
    } while (pageToken);

    allSamples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return allSamples;
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

    const allSamples: HRVSample[] = [];
    let pageToken: string | undefined;

    do {
      const result = await healthConnect.readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
        ascendingOrder: false,
        pageSize: 1000,
        pageToken,
      });

      for (const record of result.records) {
        allSamples.push({
          heartRateVariabilityMillis: record.heartRateVariabilityMillis,
          time: record.time,
        });
      }

      pageToken = result.pageToken;
    } while (pageToken);

    allSamples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return allSamples;
  } catch (error) {
    console.error('Failed to read HRV:', error);
    return [];
  }
}

type HealthRecordType =
  | 'HeartRate'
  | 'HeartRateVariabilityRmssd'
  | 'SleepSession'
  | 'RestingHeartRate'
  | 'OxygenSaturation'
  | 'RespiratoryRate'
  | 'Steps'
  | 'ActiveCaloriesBurned';

export async function getAvailableRecordCounts(
  hoursBack: number = 48
): Promise<Record<string, number>> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return {};
  }

  const recordTypes: HealthRecordType[] = [
    'HeartRate',
    'HeartRateVariabilityRmssd',
    'SleepSession',
    'RestingHeartRate',
    'OxygenSaturation',
    'RespiratoryRate',
    'Steps',
    'ActiveCaloriesBurned',
  ];

  const counts: Record<string, number> = {};
  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  for (const recordType of recordTypes) {
    try {
      let totalCount = 0;
      let pageToken: string | undefined;

      do {
        const result = await healthConnect.readRecords(recordType, {
          timeRangeFilter: {
            operator: 'between',
            startTime,
            endTime,
          },
          pageSize: 1000,
          pageToken,
        });

        totalCount += result.records?.length ?? 0;

        pageToken = result.pageToken;
      } while (pageToken);

      counts[recordType] = totalCount;
    } catch {
      counts[recordType] = -1;
    }
  }

  return counts;
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

export async function getRecentRespiratoryRate(
  minutesBack: number = 30
): Promise<RespiratoryRateSample[]> {
  if (Platform.OS !== 'android' || !healthConnect) {
    return [];
  }

  try {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - minutesBack * 60 * 1000).toISOString();

    const allSamples: RespiratoryRateSample[] = [];
    let pageToken: string | undefined;

    do {
      const result = await healthConnect.readRecords('RespiratoryRate', {
        timeRangeFilter: {
          operator: 'between',
          startTime,
          endTime,
        },
        ascendingOrder: false,
        pageSize: 1000,
        pageToken,
      });

      for (const record of result.records) {
        allSamples.push({
          rate: record.rate,
          time: record.time,
        });
      }

      pageToken = result.pageToken;
    } while (pageToken);

    allSamples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return allSamples;
  } catch (error) {
    console.error('Failed to read respiratory rate:', error);
    return [];
  }
}

export async function getCurrentVitals(): Promise<VitalsSnapshot> {
  const [hrSamples, hrvSamples, rrSamples] = await Promise.all([
    getRecentHeartRate(60),
    getRecentHRV(60),
    getRecentRespiratoryRate(60),
  ]);

  return {
    heartRate: hrSamples.length > 0 ? hrSamples[0].beatsPerMinute : null,
    hrv: hrvSamples.length > 0 ? hrvSamples[0].heartRateVariabilityMillis : null,
    respiratoryRate: rrSamples.length > 0 ? rrSamples[0].rate : null,
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

export interface HealthConnectDebugReport {
  status: HealthConnectStatus;
  permissions: PermissionRecord[];
  recordCounts: Record<string, number>;
  sampleData: {
    heartRate: HeartRateSample[];
    hrv: HRVSample[];
    respiratoryRate: RespiratoryRateSample[];
    sleepStages: SleepStageSample[];
  };
  timestamp: Date;
}

export async function runHealthConnectDebugReport(
  hoursBack: number = 24
): Promise<HealthConnectDebugReport> {
  const status = await getHealthConnectStatus();
  const permissions = await checkGrantedPermissions();
  const recordCounts = await getAvailableRecordCounts(hoursBack);

  const [hrSamples, hrvSamples, rrSamples, sleepStages] = await Promise.all([
    getRecentHeartRate(hoursBack * 60),
    getRecentHRV(hoursBack * 60),
    getRecentRespiratoryRate(hoursBack * 60),
    getRecentSleepSessions(hoursBack),
  ]);

  return {
    status,
    permissions,
    recordCounts,
    sampleData: {
      heartRate: hrSamples.slice(0, 10),
      hrv: hrvSamples.slice(0, 10),
      respiratoryRate: rrSamples.slice(0, 10),
      sleepStages: sleepStages.slice(0, 10),
    },
    timestamp: new Date(),
  };
}

export function formatHealthConnectDebugReport(report: HealthConnectDebugReport): string {
  const lines: string[] = [];

  lines.push('=== HEALTH CONNECT DEBUG REPORT ===');
  lines.push(`Generated: ${report.timestamp.toLocaleString()}`);
  lines.push('');

  lines.push('--- STATUS ---');
  lines.push(`Available: ${report.status.available}`);
  lines.push(`Initialized: ${report.status.initialized}`);
  lines.push(`Permissions Granted: ${report.status.permissionsGranted}`);
  lines.push(`SDK Status: ${report.status.sdkStatus}`);
  lines.push('');

  lines.push('--- PERMISSIONS ---');
  if (report.permissions.length === 0) {
    lines.push('No permissions granted');
  } else {
    for (const perm of report.permissions) {
      lines.push(`  ${perm.recordType}: ${perm.accessType}`);
    }
  }
  lines.push('');

  lines.push('--- RECORD COUNTS (last 24h) ---');
  for (const [type, count] of Object.entries(report.recordCounts)) {
    const status = count === -1 ? 'ERROR' : count === 0 ? 'NONE' : `${count}`;
    lines.push(`  ${type}: ${status}`);
  }
  lines.push('');

  lines.push('--- SAMPLE DATA ---');

  lines.push(`Heart Rate (${report.sampleData.heartRate.length} samples):`);
  for (const sample of report.sampleData.heartRate.slice(0, 5)) {
    const time = new Date(sample.time).toLocaleTimeString();
    lines.push(`  ${time}: ${sample.beatsPerMinute} bpm`);
  }

  lines.push(`HRV (${report.sampleData.hrv.length} samples):`);
  for (const sample of report.sampleData.hrv.slice(0, 5)) {
    const time = new Date(sample.time).toLocaleTimeString();
    lines.push(`  ${time}: ${sample.heartRateVariabilityMillis.toFixed(1)} ms`);
  }

  lines.push(`Respiratory Rate (${report.sampleData.respiratoryRate.length} samples):`);
  for (const sample of report.sampleData.respiratoryRate.slice(0, 5)) {
    const time = new Date(sample.time).toLocaleTimeString();
    lines.push(`  ${time}: ${sample.rate.toFixed(1)} bpm`);
  }

  lines.push(`Sleep Stages (${report.sampleData.sleepStages.length} samples):`);
  for (const sample of report.sampleData.sleepStages.slice(0, 5)) {
    const start = new Date(sample.startTime).toLocaleTimeString();
    const end = new Date(sample.endTime).toLocaleTimeString();
    lines.push(`  ${start}-${end}: ${sample.stage}`);
  }

  return lines.join('\n');
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
