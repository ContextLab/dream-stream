/**
 * Enhanced Sleep Stage Classifier
 *
 * Improvements over basic classifier:
 * 1. Extended history - fetches up to 30 days of Fitbit/Health Connect data
 * 2. HRV estimation from raw HR samples using sliding window RMSSD proxy
 * 3. Temporal smoothing - prior that biases toward previous state
 * 4. Leave-one-out cross-validation for parameter tuning
 * 5. Per-user calibration against Fitbit's sleep stage predictions
 */

import { Platform } from 'react-native';
import type { SleepStage } from '@/types/database';
import * as healthConnect from './healthConnect';
import { storage } from '@/lib/storage';

// ============================================================================
// Types
// ============================================================================

export interface SleepSample {
  timestamp: Date;
  heartRate: number | null;
  hrv: number | null; // From device or estimated
  hrvEstimated: number | null; // Our computed estimate
  respiratoryRate: number | null;
  fitbitStage: SleepStage | null; // Ground truth from Fitbit
}

export interface NightData {
  date: string; // YYYY-MM-DD
  samples: SleepSample[];
  sleepStart: Date;
  sleepEnd: Date;
  fitbitStages: Array<{
    stage: SleepStage;
    startTime: Date;
    endTime: Date;
  }>;
}

export interface StageStatistics {
  hrMean: number;
  hrStd: number;
  hrvMean: number;
  hrvStd: number;
  rrMean: number;
  rrStd: number;
  hrvEstMean: number;
  hrvEstStd: number;
  count: number;
}

export interface EnhancedModel {
  stageStats: Record<SleepStage, StageStatistics | null>;
  transitionMatrix: Record<SleepStage, Record<SleepStage, number>>;
  featureWeights: {
    hr: number;
    hrv: number;
    hrvEst: number;
    rr: number;
  };
  temporalSmoothingStrength: number; // 0-1, higher = more sticky
  nightsAnalyzed: number;
  lastUpdated: string;
  validationAccuracy: number | null;
  perStageAccuracy: Record<SleepStage, number>;
}

export interface ClassificationResult {
  stage: SleepStage;
  confidence: number;
  probabilities: Record<SleepStage, number>;
  usedTemporal: boolean;
}

export interface ValidationResult {
  overallAccuracy: number;
  perStageAccuracy: Record<SleepStage, number>;
  confusionMatrix: Record<SleepStage, Record<SleepStage, number>>;
  totalSamples: number;
  nightsUsed: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'enhanced_sleep_model';
const MAX_HISTORY_DAYS = 30;
const MIN_SAMPLES_PER_STAGE = 10;
const HR_SAMPLE_INTERVAL_MS = 5000; // 5 seconds between samples for HRV estimation
const HRV_WINDOW_SIZE = 30; // Number of samples for HRV estimation (2.5 min at 5s intervals)

// Default transition matrix (based on sleep research)
// Rows = from state, Cols = to state
// Values represent probability of transitioning (will be learned from data)
const DEFAULT_TRANSITION_PROBS: Record<SleepStage, Record<SleepStage, number>> = {
  awake: { awake: 0.7, light: 0.25, deep: 0.02, rem: 0.03, any: 0 },
  light: { awake: 0.1, light: 0.6, deep: 0.2, rem: 0.1, any: 0 },
  deep: { awake: 0.02, light: 0.15, deep: 0.8, rem: 0.03, any: 0 },
  rem: { awake: 0.1, light: 0.15, deep: 0.05, rem: 0.7, any: 0 },
  any: { awake: 0.25, light: 0.25, deep: 0.25, rem: 0.25, any: 0 },
};

const STAGES: SleepStage[] = ['awake', 'light', 'deep', 'rem'];

// ============================================================================
// Model State
// ============================================================================

let cachedModel: EnhancedModel | null = null;
let previousStage: SleepStage = 'awake';
let previousProbabilities: Record<SleepStage, number> = {
  awake: 0.25,
  light: 0.25,
  deep: 0.25,
  rem: 0.25,
  any: 0,
};

// ============================================================================
// Data Fetching - Extended History
// ============================================================================

/**
 * Fetch all available historical data from Health Connect (up to 30 days)
 */
export async function fetchExtendedHistory(
  daysBack: number = MAX_HISTORY_DAYS
): Promise<NightData[]> {
  if (Platform.OS !== 'android') {
    console.log('Extended history only available on Android');
    return [];
  }

  const hoursBack = daysBack * 24;
  const minutesBack = hoursBack * 60;

  console.log(`Fetching ${daysBack} days of sleep data...`);

  try {
    // Fetch all data types in parallel
    const [sleepStages, hrSamples, hrvSamples, rrSamples] = await Promise.all([
      healthConnect.getRecentSleepSessions(hoursBack),
      healthConnect.getRecentHeartRate(minutesBack),
      healthConnect.getRecentHRV(minutesBack),
      healthConnect.getRecentRespiratoryRate(minutesBack),
    ]);

    console.log(
      `Fetched: ${sleepStages.length} sleep stages, ${hrSamples.length} HR, ${hrvSamples.length} HRV, ${rrSamples.length} RR`
    );

    // Group sleep stages by night
    const nightsMap = new Map<string, NightData>();

    for (const stage of sleepStages) {
      const stageStart = new Date(stage.startTime);
      const stageEnd = new Date(stage.endTime);

      // Use sleep start date as the night identifier
      // If sleep starts before 6 AM, attribute to previous day
      const nightDate = getNightDate(stageStart);

      if (!nightsMap.has(nightDate)) {
        nightsMap.set(nightDate, {
          date: nightDate,
          samples: [],
          sleepStart: stageStart,
          sleepEnd: stageEnd,
          fitbitStages: [],
        });
      }

      const night = nightsMap.get(nightDate)!;
      night.fitbitStages.push({
        stage: stage.stage as SleepStage,
        startTime: stageStart,
        endTime: stageEnd,
      });

      // Update sleep window
      if (stageStart < night.sleepStart) night.sleepStart = stageStart;
      if (stageEnd > night.sleepEnd) night.sleepEnd = stageEnd;
    }

    // Now populate samples for each night
    for (const night of nightsMap.values()) {
      const sleepStart = night.sleepStart.getTime();
      const sleepEnd = night.sleepEnd.getTime();

      // Create samples at regular intervals during sleep
      const sampleInterval = 60 * 1000; // 1 minute intervals
      for (let t = sleepStart; t <= sleepEnd; t += sampleInterval) {
        const timestamp = new Date(t);

        // Find matching Fitbit stage
        let fitbitStage: SleepStage | null = null;
        for (const fs of night.fitbitStages) {
          if (timestamp >= fs.startTime && timestamp < fs.endTime) {
            fitbitStage = fs.stage;
            break;
          }
        }

        // Find nearest HR sample
        const hr = findNearestSample(hrSamples, timestamp, 60000, (s) => s.beatsPerMinute);
        const hrv = findNearestSample(
          hrvSamples,
          timestamp,
          60000,
          (s) => s.heartRateVariabilityMillis
        );
        const rr = findNearestSample(rrSamples, timestamp, 60000, (s) => s.rate);

        night.samples.push({
          timestamp,
          heartRate: hr,
          hrv,
          hrvEstimated: null, // Will be computed later
          respiratoryRate: rr,
          fitbitStage,
        });
      }

      // Compute estimated HRV for samples that don't have device HRV
      computeEstimatedHRV(night.samples, hrSamples);
    }

    // Convert to array and sort by date
    const nights = Array.from(nightsMap.values())
      .filter((n) => n.samples.length > 0 && n.fitbitStages.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`Processed ${nights.length} nights of data`);
    return nights;
  } catch (error) {
    console.error('Failed to fetch extended history:', error);
    return [];
  }
}

function getNightDate(timestamp: Date): string {
  const date = new Date(timestamp);
  // If before 6 AM, attribute to previous day
  if (date.getHours() < 6) {
    date.setDate(date.getDate() - 1);
  }
  return date.toISOString().split('T')[0];
}

function findNearestSample<T>(
  samples: T[],
  timestamp: Date,
  maxDeltaMs: number,
  getValue: (s: T) => number
): number | null {
  const targetTime = timestamp.getTime();
  let nearest: T | null = null;
  let nearestDelta = Infinity;

  for (const sample of samples) {
    const sampleTime = new Date((sample as any).time).getTime();
    const delta = Math.abs(sampleTime - targetTime);
    if (delta < nearestDelta && delta <= maxDeltaMs) {
      nearestDelta = delta;
      nearest = sample;
    }
  }

  return nearest ? getValue(nearest) : null;
}

// ============================================================================
// HRV Estimation from Heart Rate Samples
// ============================================================================

/**
 * Estimate HRV from heart rate samples using RMSSD proxy
 *
 * True HRV requires RR intervals (beat-to-beat timing).
 * With only BPM readings, we can estimate HRV using the variability
 * of successive heart rate measurements as a proxy.
 *
 * Formula: RMSSD_proxy = sqrt(mean((HR[i] - HR[i-1])^2))
 * Then convert to approximate ms using: HRV_est = 60000 / HR * RMSSD_proxy
 */
export function computeEstimatedHRV(
  samples: SleepSample[],
  hrSamples: healthConnect.HeartRateSample[]
): void {
  // Sort HR samples by time
  const sortedHR = [...hrSamples].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  for (const sample of samples) {
    if (sample.hrv !== null) {
      // Already have device HRV, use that
      sample.hrvEstimated = sample.hrv;
      continue;
    }

    // Find HR samples in a window around this timestamp
    const windowStart = sample.timestamp.getTime() - (HRV_WINDOW_SIZE * HR_SAMPLE_INTERVAL_MS) / 2;
    const windowEnd = sample.timestamp.getTime() + (HRV_WINDOW_SIZE * HR_SAMPLE_INTERVAL_MS) / 2;

    const windowHR = sortedHR.filter((hr) => {
      const t = new Date(hr.time).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    if (windowHR.length < 5) {
      sample.hrvEstimated = null;
      continue;
    }

    // Compute RMSSD proxy
    const diffs: number[] = [];
    for (let i = 1; i < windowHR.length; i++) {
      const diff = windowHR[i].beatsPerMinute - windowHR[i - 1].beatsPerMinute;
      diffs.push(diff * diff);
    }

    if (diffs.length === 0) {
      sample.hrvEstimated = null;
      continue;
    }

    const rmssd = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / diffs.length);

    // Convert to approximate HRV in ms
    // Average RR interval = 60000 / avgHR (in ms)
    // HRV is roughly proportional to RR interval variability
    const avgHR = windowHR.reduce((a, b) => a + b.beatsPerMinute, 0) / windowHR.length;
    const avgRR = 60000 / avgHR;

    // Scale factor derived empirically: typical RMSSD ~20-50ms, typical HR diff ~1-5 bpm
    // HRV_est = avgRR * (rmssd / avgHR) * scaleFactor
    const scaleFactor = 10; // Tunable parameter
    sample.hrvEstimated = avgRR * (rmssd / avgHR) * scaleFactor;

    // Clamp to reasonable range
    sample.hrvEstimated = Math.max(5, Math.min(150, sample.hrvEstimated));
  }
}

// ============================================================================
// Model Training
// ============================================================================

/**
 * Train the model from historical night data
 */
export async function trainModel(nights: NightData[]): Promise<EnhancedModel> {
  const stageStats: Record<SleepStage, StageStatistics | null> = {
    awake: null,
    light: null,
    deep: null,
    rem: null,
    any: null,
  };

  // Collect data per stage
  const stageData: Record<
    SleepStage,
    { hrs: number[]; hrvs: number[]; hrvEsts: number[]; rrs: number[] }
  > = {
    awake: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    light: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    deep: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    rem: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    any: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
  };

  // Learn transition matrix
  const transitions: Record<SleepStage, Record<SleepStage, number>> = {
    awake: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    light: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    deep: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    rem: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    any: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };

  for (const night of nights) {
    let prevStage: SleepStage | null = null;

    for (const sample of night.samples) {
      if (!sample.fitbitStage || sample.fitbitStage === 'any') continue;

      const stage = sample.fitbitStage;

      if (sample.heartRate !== null) {
        stageData[stage].hrs.push(sample.heartRate);
      }
      if (sample.hrv !== null) {
        stageData[stage].hrvs.push(sample.hrv);
      }
      if (sample.hrvEstimated !== null) {
        stageData[stage].hrvEsts.push(sample.hrvEstimated);
      }
      if (sample.respiratoryRate !== null) {
        stageData[stage].rrs.push(sample.respiratoryRate);
      }

      // Track transitions (prevStage is already filtered to exclude 'any' via fitbitStage check)
      if (prevStage) {
        transitions[prevStage][stage]++;
      }
      prevStage = stage;
    }
  }

  // Compute statistics for each stage
  for (const stage of STAGES) {
    const data = stageData[stage];
    if (data.hrs.length >= MIN_SAMPLES_PER_STAGE) {
      stageStats[stage] = {
        hrMean: mean(data.hrs),
        hrStd: std(data.hrs),
        hrvMean: data.hrvs.length > 0 ? mean(data.hrvs) : 0,
        hrvStd: data.hrvs.length > 0 ? std(data.hrvs) : 1,
        rrMean: data.rrs.length > 0 ? mean(data.rrs) : 0,
        rrStd: data.rrs.length > 0 ? std(data.rrs) : 1,
        hrvEstMean: data.hrvEsts.length > 0 ? mean(data.hrvEsts) : 0,
        hrvEstStd: data.hrvEsts.length > 0 ? std(data.hrvEsts) : 1,
        count: data.hrs.length,
      };
    }
  }

  // Normalize transition matrix to probabilities
  const transitionMatrix: Record<SleepStage, Record<SleepStage, number>> = {
    awake: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    light: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    deep: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    rem: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    any: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };

  for (const from of STAGES) {
    const total = STAGES.reduce((sum, to) => sum + transitions[from][to], 0);
    if (total > 0) {
      for (const to of STAGES) {
        // Blend with default probabilities for smoothing
        const empirical = transitions[from][to] / total;
        const prior = DEFAULT_TRANSITION_PROBS[from][to];
        transitionMatrix[from][to] = 0.7 * empirical + 0.3 * prior;
      }
    } else {
      // Use default if no data
      for (const to of STAGES) {
        transitionMatrix[from][to] = DEFAULT_TRANSITION_PROBS[from][to];
      }
    }
  }

  const model: EnhancedModel = {
    stageStats,
    transitionMatrix,
    featureWeights: {
      hr: 0.4,
      hrv: 0.3,
      hrvEst: 0.15,
      rr: 0.15,
    },
    temporalSmoothingStrength: 0.3, // Default, will be tuned
    nightsAnalyzed: nights.length,
    lastUpdated: new Date().toISOString(),
    validationAccuracy: null,
    perStageAccuracy: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };

  await saveEnhancedModel(model);
  return model;
}

// ============================================================================
// Leave-One-Out Cross-Validation
// ============================================================================

/**
 * Run leave-one-out cross-validation to tune model parameters.
 * Optimizes for REM detection (balanced accuracy with REM emphasis).
 */
export async function runCrossValidation(
  nights: NightData[],
  parameterGrid?: {
    temporalSmoothingStrengths?: number[];
    hrWeights?: number[];
    hrvWeights?: number[];
  }
): Promise<{
  bestParams: { temporalSmoothing: number; hrWeight: number; hrvWeight: number };
  bestAccuracy: number;
  allResults: ValidationResult[];
}> {
  const smoothingValues = parameterGrid?.temporalSmoothingStrengths ?? [0, 0.1, 0.2, 0.3, 0.5, 1.0];
  const hrWeightValues = parameterGrid?.hrWeights ?? [0.2, 0.3, 0.4, 0.5];
  const hrvWeightValues = parameterGrid?.hrvWeights ?? [0.2, 0.3, 0.4, 0.5];

  let bestParams = { temporalSmoothing: 0.2, hrWeight: 0.4, hrvWeight: 0.3 };
  let bestScore = -Infinity;
  const allResults: ValidationResult[] = [];

  for (const smoothing of smoothingValues) {
    for (const hrWeight of hrWeightValues) {
      for (const hrvWeight of hrvWeightValues) {
        if (hrWeight + hrvWeight > 0.9) continue;

        const rrWeight = Math.max(0.05, 1 - hrWeight - hrvWeight - 0.1);
        const hrvEstWeight = 0.1;

        const result = await leaveOneOutValidation(nights, {
          temporalSmoothing: smoothing,
          featureWeights: { hr: hrWeight, hrv: hrvWeight, hrvEst: hrvEstWeight, rr: rrWeight },
        });

        allResults.push(result);

        const remAccuracy = result.perStageAccuracy.rem;
        const awakeAccuracy = result.perStageAccuracy.awake;
        const balancedAccuracy =
          (result.perStageAccuracy.awake +
            result.perStageAccuracy.light +
            result.perStageAccuracy.deep +
            result.perStageAccuracy.rem) /
          4;

        // Score: prioritize REM detection, then balanced accuracy
        const score = remAccuracy * 2 + awakeAccuracy + balancedAccuracy;

        if (score > bestScore) {
          bestScore = score;
          bestParams = { temporalSmoothing: smoothing, hrWeight, hrvWeight };
        }
      }
    }
  }

  const bestResult = await leaveOneOutValidation(nights, {
    temporalSmoothing: bestParams.temporalSmoothing,
    featureWeights: {
      hr: bestParams.hrWeight,
      hrv: bestParams.hrvWeight,
      hrvEst: 0.1,
      rr: Math.max(0.05, 1 - bestParams.hrWeight - bestParams.hrvWeight - 0.1),
    },
  });

  return { bestParams, bestAccuracy: bestResult.overallAccuracy, allResults };
}

async function leaveOneOutValidation(
  nights: NightData[],
  params: {
    temporalSmoothing: number;
    featureWeights: { hr: number; hrv: number; hrvEst: number; rr: number };
  }
): Promise<ValidationResult> {
  const confusionMatrix: Record<SleepStage, Record<SleepStage, number>> = {
    awake: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    light: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    deep: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    rem: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    any: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };

  let correct = 0;
  let total = 0;

  for (let i = 0; i < nights.length; i++) {
    // Train on all nights except i
    const trainNights = nights.filter((_, idx) => idx !== i);
    const testNight = nights[i];

    // Quick train (in-memory only)
    const tempModel = await trainModelInMemory(trainNights, params);

    // Test on held-out night
    let prevStage: SleepStage = 'awake';
    let prevProbs: Record<SleepStage, number> = {
      awake: 0.25,
      light: 0.25,
      deep: 0.25,
      rem: 0.25,
      any: 0,
    };

    for (const sample of testNight.samples) {
      if (!sample.fitbitStage || sample.fitbitStage === 'any') continue;
      if (sample.heartRate === null) continue;

      const result = classifyWithModelInternal(
        tempModel,
        sample.heartRate,
        sample.hrv,
        sample.hrvEstimated,
        sample.respiratoryRate,
        prevStage,
        prevProbs
      );

      const actual = sample.fitbitStage;
      const predicted = result.stage;

      confusionMatrix[actual][predicted]++;
      if (actual === predicted) correct++;
      total++;

      prevStage = result.stage;
      prevProbs = result.probabilities;
    }
  }

  // Compute per-stage accuracy
  const perStageAccuracy: Record<SleepStage, number> = {
    awake: 0,
    light: 0,
    deep: 0,
    rem: 0,
    any: 0,
  };
  for (const stage of STAGES) {
    const stageTotal = STAGES.reduce((sum, s) => sum + confusionMatrix[stage][s], 0);
    perStageAccuracy[stage] = stageTotal > 0 ? confusionMatrix[stage][stage] / stageTotal : 0;
  }

  return {
    overallAccuracy: total > 0 ? correct / total : 0,
    perStageAccuracy,
    confusionMatrix,
    totalSamples: total,
    nightsUsed: nights.length,
  };
}

async function trainModelInMemory(
  nights: NightData[],
  params: {
    temporalSmoothing: number;
    featureWeights: { hr: number; hrv: number; hrvEst: number; rr: number };
  }
): Promise<EnhancedModel> {
  // Simplified training without persistence
  const stageData: Record<
    SleepStage,
    { hrs: number[]; hrvs: number[]; hrvEsts: number[]; rrs: number[] }
  > = {
    awake: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    light: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    deep: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    rem: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
    any: { hrs: [], hrvs: [], hrvEsts: [], rrs: [] },
  };

  const transitions: Record<SleepStage, Record<SleepStage, number>> = {
    awake: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    light: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    deep: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    rem: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    any: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };

  for (const night of nights) {
    let prevStage: SleepStage | null = null;
    for (const sample of night.samples) {
      if (!sample.fitbitStage || sample.fitbitStage === 'any') continue;
      const stage = sample.fitbitStage;

      if (sample.heartRate !== null) stageData[stage].hrs.push(sample.heartRate);
      if (sample.hrv !== null) stageData[stage].hrvs.push(sample.hrv);
      if (sample.hrvEstimated !== null) stageData[stage].hrvEsts.push(sample.hrvEstimated);
      if (sample.respiratoryRate !== null) stageData[stage].rrs.push(sample.respiratoryRate);

      if (prevStage) transitions[prevStage][stage]++;
      prevStage = stage;
    }
  }

  const stageStats: Record<SleepStage, StageStatistics | null> = {
    awake: null,
    light: null,
    deep: null,
    rem: null,
    any: null,
  };

  for (const stage of STAGES) {
    const data = stageData[stage];
    if (data.hrs.length >= 3) {
      stageStats[stage] = {
        hrMean: mean(data.hrs),
        hrStd: Math.max(1, std(data.hrs)),
        hrvMean: data.hrvs.length > 0 ? mean(data.hrvs) : 0,
        hrvStd: data.hrvs.length > 0 ? Math.max(1, std(data.hrvs)) : 1,
        rrMean: data.rrs.length > 0 ? mean(data.rrs) : 0,
        rrStd: data.rrs.length > 0 ? Math.max(1, std(data.rrs)) : 1,
        hrvEstMean: data.hrvEsts.length > 0 ? mean(data.hrvEsts) : 0,
        hrvEstStd: data.hrvEsts.length > 0 ? Math.max(1, std(data.hrvEsts)) : 1,
        count: data.hrs.length,
      };
    }
  }

  const transitionMatrix: Record<SleepStage, Record<SleepStage, number>> = {
    awake: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    light: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    deep: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    rem: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
    any: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };

  for (const from of STAGES) {
    const total = STAGES.reduce((sum, to) => sum + transitions[from][to], 0);
    for (const to of STAGES) {
      transitionMatrix[from][to] =
        total > 0
          ? 0.7 * (transitions[from][to] / total) + 0.3 * DEFAULT_TRANSITION_PROBS[from][to]
          : DEFAULT_TRANSITION_PROBS[from][to];
    }
  }

  return {
    stageStats,
    transitionMatrix,
    featureWeights: params.featureWeights,
    temporalSmoothingStrength: params.temporalSmoothing,
    nightsAnalyzed: nights.length,
    lastUpdated: new Date().toISOString(),
    validationAccuracy: null,
    perStageAccuracy: { awake: 0, light: 0, deep: 0, rem: 0, any: 0 },
  };
}

// ============================================================================
// Classification with Temporal Smoothing
// ============================================================================

/**
 * Classify current vitals with temporal smoothing prior
 */
export function classifyWithTemporal(
  model: EnhancedModel,
  heartRate: number,
  hrv: number | null,
  hrvEstimated: number | null,
  respiratoryRate: number | null
): ClassificationResult {
  const result = classifyWithModelInternal(
    model,
    heartRate,
    hrv,
    hrvEstimated,
    respiratoryRate,
    previousStage,
    previousProbabilities
  );

  // Update state for next call
  previousStage = result.stage;
  previousProbabilities = result.probabilities;

  return result;
}

function classifyWithModelInternal(
  model: EnhancedModel,
  heartRate: number,
  hrv: number | null,
  hrvEstimated: number | null,
  respiratoryRate: number | null,
  prevStage: SleepStage,
  prevProbs: Record<SleepStage, number>
): ClassificationResult {
  const logLikelihoods: number[] = [];

  for (const stage of STAGES) {
    const stats = model.stageStats[stage];
    if (!stats) {
      logLikelihoods.push(-5);
      continue;
    }

    let logLikelihood = 0;
    let featureCount = 0;

    if (heartRate !== null && stats.hrStd > 0) {
      logLikelihood +=
        gaussianLogLikelihood(heartRate, stats.hrMean, stats.hrStd) * model.featureWeights.hr;
      featureCount++;
    }

    if (hrv !== null && stats.hrvMean > 0 && stats.hrvStd > 0) {
      logLikelihood +=
        gaussianLogLikelihood(hrv, stats.hrvMean, stats.hrvStd) * model.featureWeights.hrv;
      featureCount++;
    }

    if (hrvEstimated !== null && stats.hrvEstMean > 0 && stats.hrvEstStd > 0) {
      logLikelihood +=
        gaussianLogLikelihood(hrvEstimated, stats.hrvEstMean, stats.hrvEstStd) *
        model.featureWeights.hrvEst;
      featureCount++;
    }

    if (respiratoryRate !== null && stats.rrMean > 0 && stats.rrStd > 0) {
      logLikelihood +=
        gaussianLogLikelihood(respiratoryRate, stats.rrMean, stats.rrStd) * model.featureWeights.rr;
      featureCount++;
    }

    if (featureCount > 0) {
      logLikelihood /= featureCount;
    }

    logLikelihoods.push(logLikelihood);
  }

  // Apply temporal smoothing in log space
  const smoothing = model.temporalSmoothingStrength;
  const logPosteriors: number[] = [];

  for (let i = 0; i < STAGES.length; i++) {
    const stage = STAGES[i];
    const transitionProb = model.transitionMatrix[prevStage][stage];
    const logTransition = transitionProb > 0 ? Math.log(transitionProb) : -10;

    // Sticky bonus for staying in same state
    const stickyBonus = stage === prevStage ? smoothing * 2 : 0;

    // Previous probability bonus
    const prevBonus = prevProbs[stage] > 0.1 ? Math.log(1 + prevProbs[stage]) * smoothing : 0;

    logPosteriors.push(logLikelihoods[i] + logTransition * 0.5 + stickyBonus + prevBonus);
  }

  // Convert to probabilities via softmax
  const probs = softmax(logPosteriors);
  const probabilities: Record<SleepStage, number> = { awake: 0, light: 0, deep: 0, rem: 0, any: 0 };
  for (let i = 0; i < STAGES.length; i++) {
    probabilities[STAGES[i]] = probs[i];
  }

  // Find most likely stage
  let bestStage: SleepStage = 'awake';
  let maxProb = 0;
  for (const stage of STAGES) {
    if (probabilities[stage] > maxProb) {
      maxProb = probabilities[stage];
      bestStage = stage;
    }
  }

  const sortedProbs = [...probs].sort((a, b) => b - a);
  const confidence = sortedProbs[0] - sortedProbs[1] + sortedProbs[0] * 0.5;

  return {
    stage: bestStage,
    confidence: Math.min(1, confidence),
    probabilities,
    usedTemporal: smoothing > 0,
  };
}

// ============================================================================
// Model Persistence
// ============================================================================

export async function loadEnhancedModel(): Promise<EnhancedModel | null> {
  if (cachedModel) return cachedModel;

  const stored = await storage.get<EnhancedModel>(STORAGE_KEY);
  if (stored) {
    cachedModel = stored;
    return stored;
  }

  return null;
}

export async function saveEnhancedModel(model: EnhancedModel): Promise<void> {
  cachedModel = model;
  await storage.set(STORAGE_KEY, model);
}

export async function clearEnhancedModel(): Promise<void> {
  cachedModel = null;
  await storage.remove(STORAGE_KEY);
}

export function resetTemporalState(): void {
  previousStage = 'awake';
  previousProbabilities = { awake: 0.25, light: 0.25, deep: 0.25, rem: 0.25, any: 0 };
}

// ============================================================================
// Utility Functions
// ============================================================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

function gaussianLogLikelihood(value: number, mean: number, std: number): number {
  if (std === 0) return value === mean ? 0 : -10;
  const z = (value - mean) / std;
  return -0.5 * z * z;
}

function softmax(logProbs: number[]): number[] {
  const maxLog = Math.max(...logProbs);
  const exps = logProbs.map((lp) => Math.exp(lp - maxLog));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// ============================================================================
// Main Entry Point
// ============================================================================

export type ProgressCallback = (message: string) => void;

/**
 * Full training and validation pipeline
 */
export async function trainAndValidate(onProgress?: ProgressCallback): Promise<{
  model: EnhancedModel;
  validation: ValidationResult;
  bestParams: { temporalSmoothing: number; hrWeight: number; hrvWeight: number };
}> {
  const report = onProgress ?? console.log;

  report('Fetching sleep data from wearable...');
  const nights = await fetchExtendedHistory(MAX_HISTORY_DAYS);

  if (nights.length < 2) {
    throw new Error(`Insufficient data: only ${nights.length} nights found (need at least 2)`);
  }

  const totalSamples = nights.reduce((sum, n) => sum + n.samples.length, 0);
  report(`Found ${nights.length} nights with ${totalSamples} samples. Optimizing classifier...`);

  const { bestParams, bestAccuracy } = await runCrossValidation(nights);

  report('Training final model with best parameters...');
  const model = await trainModelInMemory(nights, {
    temporalSmoothing: bestParams.temporalSmoothing,
    featureWeights: {
      hr: bestParams.hrWeight,
      hrv: bestParams.hrvWeight,
      hrvEst: 0.1,
      rr: 1 - bestParams.hrWeight - bestParams.hrvWeight - 0.1,
    },
  });

  model.validationAccuracy = bestAccuracy;

  report('Running final validation...');
  const finalValidation = await leaveOneOutValidation(nights, {
    temporalSmoothing: bestParams.temporalSmoothing,
    featureWeights: model.featureWeights,
  });

  model.perStageAccuracy = finalValidation.perStageAccuracy;

  await saveEnhancedModel(model);

  report(`Training complete! Accuracy: ${(bestAccuracy * 100).toFixed(1)}%`);

  return { model, validation: finalValidation, bestParams };
}
