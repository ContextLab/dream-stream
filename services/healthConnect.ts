import { Platform } from 'react-native';

type Permission = { accessType: 'read' | 'write'; recordType: string };

type TimeRangeFilter = {
  operator: 'between' | 'after' | 'before';
  startTime: string;
  endTime?: string;
};

type ReadRecordsOptions = {
  timeRangeFilter: TimeRangeFilter;
};

type HealthConnectModule = {
  initialize: (providerPackageName?: string) => Promise<boolean>;
  requestPermission: (permissions: Permission[]) => Promise<Permission[]>;
  getGrantedPermissions: () => Promise<Permission[]>;
  readRecords: <T extends string>(
    recordType: T,
    options: ReadRecordsOptions
  ) => Promise<{ records: unknown[] }>;
  getSdkStatus: (providerPackageName?: string) => Promise<number>;
  openHealthConnectSettings: () => void;
};

let healthConnect: HealthConnectModule | null = null;

async function getHealthConnect(): Promise<HealthConnectModule | null> {
  if (Platform.OS !== 'android') return null;
  if (healthConnect) return healthConnect;

  try {
    const module = await import('react-native-health-connect');
    healthConnect = module as unknown as HealthConnectModule;
    return healthConnect;
  } catch (err) {
    console.error('[HealthConnect] Failed to import module:', err);
    return null;
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

const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'SleepSession' },
];

export async function getHealthConnectStatus(): Promise<HealthConnectStatus> {
  const hc = await getHealthConnect();

  if (!hc) {
    return {
      available: false,
      initialized: false,
      permissionsGranted: false,
      sdkStatus: 'unavailable',
    };
  }

  try {
    const sdkStatusCode = await hc.getSdkStatus();
    const sdkStatus =
      sdkStatusCode === 3 ? 'available' : sdkStatusCode === 2 ? 'installed' : 'unavailable';

    if (sdkStatus !== 'available') {
      return {
        available: false,
        initialized: false,
        permissionsGranted: false,
        sdkStatus,
      };
    }

    const initialized = await hc.initialize();

    return {
      available: true,
      initialized,
      permissionsGranted: false,
      sdkStatus,
    };
  } catch {
    return {
      available: false,
      initialized: false,
      permissionsGranted: false,
      sdkStatus: 'unavailable',
    };
  }
}

export async function initializeHealthConnect(): Promise<boolean> {
  const hc = await getHealthConnect();
  if (!hc) return false;

  try {
    return await hc.initialize();
  } catch {
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  const hc = await getHealthConnect();
  if (!hc) return false;

  try {
    const initialized = await hc.initialize();
    if (!initialized) {
      console.error('[HealthConnect] Failed to initialize before requesting permissions');
      return false;
    }

    console.log('[HealthConnect] Requesting permissions:', REQUIRED_PERMISSIONS);
    const granted = await hc.requestPermission(REQUIRED_PERMISSIONS);
    console.log('[HealthConnect] Granted permissions:', granted);

    return Array.isArray(granted) && granted.length > 0;
  } catch (err) {
    console.error('[HealthConnect] Permission request failed:', err);
    return false;
  }
}

export async function checkGrantedPermissions(): Promise<Permission[]> {
  const hc = await getHealthConnect();
  if (!hc) return [];

  try {
    const granted = await hc.getGrantedPermissions();
    console.log('[HealthConnect] Currently granted permissions:', granted);
    return granted;
  } catch (err) {
    console.error('[HealthConnect] Failed to get granted permissions:', err);
    return [];
  }
}

export function openHealthConnectSettings(): void {
  getHealthConnect().then((hc) => {
    if (hc) {
      hc.openHealthConnectSettings();
    }
  });
}

export async function getRecentHeartRate(minutesBack: number = 30): Promise<HeartRateSample[]> {
  const hc = await getHealthConnect();
  if (!hc) {
    console.log('[HealthConnect] Module not available for HR read');
    return [];
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - minutesBack * 60 * 1000);

  console.log(
    '[HealthConnect] Reading HeartRate from',
    startTime.toISOString(),
    'to',
    now.toISOString()
  );

  try {
    const result = await hc.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      },
    });

    console.log('[HealthConnect] HeartRate raw result:', JSON.stringify(result, null, 2));

    const records = result.records || [];
    const samples: HeartRateSample[] = [];

    for (const record of records as Array<{
      samples?: Array<{ beatsPerMinute: number; time: string }>;
      startTime?: string;
      endTime?: string;
    }>) {
      if (record.samples && Array.isArray(record.samples)) {
        for (const sample of record.samples) {
          samples.push({
            beatsPerMinute: sample.beatsPerMinute,
            time: sample.time,
          });
        }
      }
    }

    console.log('[HealthConnect] Parsed HR samples:', samples.length);
    return samples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  } catch (err) {
    console.error('[HealthConnect] Failed to read HeartRate:', err);
    return [];
  }
}

export async function getRecentHRV(minutesBack: number = 30): Promise<HRVSample[]> {
  const hc = await getHealthConnect();
  if (!hc) {
    console.log('[HealthConnect] Module not available for HRV read');
    return [];
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - minutesBack * 60 * 1000);

  console.log('[HealthConnect] Reading HRV from', startTime.toISOString(), 'to', now.toISOString());

  try {
    const result = await hc.readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      },
    });

    console.log('[HealthConnect] HRV raw result:', JSON.stringify(result, null, 2));

    const records = result.records || [];
    const samples: HRVSample[] = [];

    for (const record of records as Array<{
      heartRateVariabilityMillis?: number;
      time?: string;
      startTime?: string;
      endTime?: string;
    }>) {
      // HRV records may have different structures depending on source
      const hrvValue = record.heartRateVariabilityMillis;
      const time = record.time || record.startTime || record.endTime;

      if (hrvValue !== undefined && time) {
        samples.push({
          heartRateVariabilityMillis: hrvValue,
          time: time,
        });
      }
    }

    console.log('[HealthConnect] Parsed HRV samples:', samples.length);
    return samples.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  } catch (err) {
    console.error('[HealthConnect] Failed to read HRV:', err);
    return [];
  }
}

export async function getRecentSleepSessions(hoursBack: number = 12): Promise<SleepStageSample[]> {
  const hc = await getHealthConnect();
  if (!hc) return [];

  const now = new Date();
  const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

  try {
    const { records } = await hc.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      },
    });

    const stages: SleepStageSample[] = [];
    for (const session of records as Array<{
      stages?: Array<{ stage: number; startTime: string; endTime: string }>;
    }>) {
      if (session.stages) {
        for (const stage of session.stages) {
          stages.push({
            stage: mapSleepStageCode(stage.stage),
            startTime: stage.startTime,
            endTime: stage.endTime,
          });
        }
      }
    }

    return stages.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  } catch {
    return [];
  }
}

function mapSleepStageCode(code: number): SleepStage {
  switch (code) {
    case 1:
      return 'awake';
    case 4:
      return 'light';
    case 5:
      return 'deep';
    case 6:
      return 'rem';
    default:
      return 'unknown';
  }
}

export interface VitalsSnapshot {
  heartRate: number | null;
  hrv: number | null;
  timestamp: Date;
}

export async function getCurrentVitals(): Promise<VitalsSnapshot> {
  // HR updates frequently, but HRV is only recorded during sleep or stress measurements
  // so we need a longer lookback window for HRV
  const [hrSamples, hrvSamples] = await Promise.all([getRecentHeartRate(30), getRecentHRV(480)]);

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

  const status = await getHealthConnectStatus();
  steps.push({
    name: 'Health Connect SDK Available',
    passed: status.sdkStatus === 'available',
    error: status.sdkStatus !== 'available' ? `SDK status: ${status.sdkStatus}` : undefined,
  });

  if (status.sdkStatus !== 'available') {
    return { success: false, steps };
  }

  const initialized = await initializeHealthConnect();
  steps.push({
    name: 'Initialize Health Connect',
    passed: initialized,
    error: !initialized ? 'Failed to initialize' : undefined,
  });

  if (!initialized) {
    return { success: false, steps };
  }

  const grantedPermissions = await checkGrantedPermissions();
  const hasHrPermission = grantedPermissions.some(
    (p) => p.recordType === 'HeartRate' && p.accessType === 'read'
  );
  const hasHrvPermission = grantedPermissions.some(
    (p) => p.recordType === 'HeartRateVariabilityRmssd' && p.accessType === 'read'
  );

  steps.push({
    name: 'Permissions Granted',
    passed: hasHrPermission && hasHrvPermission,
    error:
      !hasHrPermission || !hasHrvPermission
        ? `Missing: ${!hasHrPermission ? 'HeartRate ' : ''}${!hasHrvPermission ? 'HRV' : ''}`
        : undefined,
    detail: `Granted: ${grantedPermissions.map((p) => p.recordType).join(', ') || 'none'}`,
  });

  if (!hasHrPermission && !hasHrvPermission) {
    steps.push({
      name: 'Read Heart Rate Data',
      passed: false,
      error: 'Permission not granted - tap "Open Health Connect Settings" to grant access',
    });
    steps.push({
      name: 'Read HRV Data',
      passed: false,
      error: 'Permission not granted - tap "Open Health Connect Settings" to grant access',
    });
    return { success: false, steps };
  }

  const hrSamples = await getRecentHeartRate(60);
  steps.push({
    name: 'Read Heart Rate Data',
    passed: hrSamples.length > 0,
    error:
      hrSamples.length === 0
        ? hasHrPermission
          ? 'No data found - ensure watch is synced with Health Connect'
          : 'Permission not granted'
        : undefined,
    detail: hrSamples.length > 0 ? `Found ${hrSamples.length} samples` : undefined,
  });

  const hrvSamples = await getRecentHRV(480);
  steps.push({
    name: 'Read HRV Data',
    passed: hrvSamples.length > 0,
    error:
      hrvSamples.length === 0
        ? hasHrvPermission
          ? 'No recent data - Pixel Watch records HRV during sleep or stress measurements'
          : 'Permission not granted'
        : undefined,
    detail: hrvSamples.length > 0 ? `Found ${hrvSamples.length} samples` : undefined,
  });

  const allPassed = steps.every((s) => s.passed);
  return { success: allPassed, steps };
}

export const SUPPORTED_DEVICES = [
  {
    name: 'Google Pixel Watch',
    manufacturer: 'Google',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Full support via Health Connect',
  },
  {
    name: 'Samsung Galaxy Watch (4, 5, 6, Ultra)',
    manufacturer: 'Samsung',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Requires Samsung Health sync to Health Connect',
  },
  {
    name: 'Fitbit (Sense 2, Versa 4, Charge 6)',
    manufacturer: 'Google/Fitbit',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Requires Fitbit app with Health Connect enabled',
  },
  {
    name: 'Wear OS Watches',
    manufacturer: 'Various',
    features: ['Heart Rate', 'Sleep (varies)'],
    notes: 'Support varies by manufacturer',
  },
  {
    name: 'Oura Ring (Gen 3)',
    manufacturer: 'Oura',
    features: ['Heart Rate', 'HRV', 'Sleep Stages'],
    notes: 'Requires Oura app with Health Connect sync',
  },
  {
    name: 'Withings ScanWatch',
    manufacturer: 'Withings',
    features: ['Heart Rate', 'Sleep'],
    notes: 'Requires Withings app with Health Connect sync',
  },
];
