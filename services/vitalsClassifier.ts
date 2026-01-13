import type { SleepStage } from '@/types/database';
import type { HeartRateSample, HRVSample, VitalsSnapshot } from './healthConnect';
import {
  loadModel,
  isModelValid,
  classifyWithModel,
  refreshModelIfNeeded,
} from './sleepStageLearning';

interface VitalsWindow {
  heartRates: number[];
  hrvValues: number[];
  timestamps: Date[];
}

interface VitalsAnalysis {
  avgHeartRate: number;
  heartRateVariability: number;
  hrvTrend: 'increasing' | 'decreasing' | 'stable';
  hrTrend: 'increasing' | 'decreasing' | 'stable';
  estimatedStage: SleepStage;
  confidence: number;
}

const HR_AWAKE_MIN = 65;
const HR_LIGHT_SLEEP_MAX = 60;
const HR_DEEP_SLEEP_MAX = 55;
const HR_REM_RANGE = { min: 60, max: 75 };

const HRV_AWAKE_MAX = 30;
const HRV_LIGHT_SLEEP_RANGE = { min: 30, max: 50 };
const HRV_DEEP_SLEEP_MIN = 50;
const HRV_REM_VARIABILITY_THRESHOLD = 0.3;

const WINDOW_SIZE_MINUTES = 5;
const MIN_SAMPLES_FOR_CLASSIFICATION = 3;

let vitalsWindow: VitalsWindow = {
  heartRates: [],
  hrvValues: [],
  timestamps: [],
};

let lastClassifiedStage: SleepStage = 'awake';
let stageConfidenceHistory: number[] = [];
let useLearnedModel = true;
let modelCheckDone = false;

export function addVitalsSample(vitals: VitalsSnapshot): void {
  const { heartRate, hrv, timestamp } = vitals;

  if (heartRate !== null) {
    vitalsWindow.heartRates.push(heartRate);
  }
  if (hrv !== null) {
    vitalsWindow.hrvValues.push(hrv);
  }
  vitalsWindow.timestamps.push(timestamp);

  pruneOldSamples();
}

export function addHeartRateSamples(samples: HeartRateSample[]): void {
  for (const sample of samples) {
    vitalsWindow.heartRates.push(sample.beatsPerMinute);
    vitalsWindow.timestamps.push(new Date(sample.time));
  }
  pruneOldSamples();
}

export function addHRVSamples(samples: HRVSample[]): void {
  for (const sample of samples) {
    vitalsWindow.hrvValues.push(sample.heartRateVariabilityMillis);
    vitalsWindow.timestamps.push(new Date(sample.time));
  }
  pruneOldSamples();
}

function pruneOldSamples(): void {
  const cutoff = new Date(Date.now() - WINDOW_SIZE_MINUTES * 60 * 1000);

  while (vitalsWindow.timestamps.length > 0 && vitalsWindow.timestamps[0] < cutoff) {
    vitalsWindow.timestamps.shift();
    if (vitalsWindow.heartRates.length > vitalsWindow.timestamps.length) {
      vitalsWindow.heartRates.shift();
    }
    if (vitalsWindow.hrvValues.length > vitalsWindow.timestamps.length) {
      vitalsWindow.hrvValues.shift();
    }
  }
}

export function analyzeVitals(): VitalsAnalysis {
  const hrs = vitalsWindow.heartRates;
  const hrvs = vitalsWindow.hrvValues;

  if (hrs.length < MIN_SAMPLES_FOR_CLASSIFICATION) {
    return {
      avgHeartRate: hrs.length > 0 ? hrs[hrs.length - 1] : 0,
      heartRateVariability: hrvs.length > 0 ? hrvs[hrvs.length - 1] : 0,
      hrvTrend: 'stable',
      hrTrend: 'stable',
      estimatedStage: lastClassifiedStage,
      confidence: 0,
    };
  }

  const avgHeartRate = hrs.reduce((a, b) => a + b, 0) / hrs.length;
  const avgHRV = hrvs.length > 0 ? hrvs.reduce((a, b) => a + b, 0) / hrvs.length : 0;

  const hrTrend = calculateTrend(hrs);
  const hrvTrend = calculateTrend(hrvs);

  const hrvVariability = calculateVariability(hrvs);

  const stage = classifySleepStage(avgHeartRate, avgHRV, hrTrend, hrvTrend, hrvVariability);
  const confidence = calculateConfidence(hrs.length, hrvs.length, stage);

  if (confidence > 0.5) {
    lastClassifiedStage = stage;
  }

  stageConfidenceHistory.push(confidence);
  if (stageConfidenceHistory.length > 10) {
    stageConfidenceHistory.shift();
  }

  return {
    avgHeartRate,
    heartRateVariability: avgHRV,
    hrvTrend,
    hrTrend,
    estimatedStage: stage,
    confidence,
  };
}

export async function analyzeVitalsWithLearning(): Promise<VitalsAnalysis> {
  const basicAnalysis = analyzeVitals();

  if (!useLearnedModel) {
    return basicAnalysis;
  }

  if (!modelCheckDone) {
    modelCheckDone = true;
    refreshModelIfNeeded().catch(console.error);
  }

  try {
    const model = await loadModel();
    if (!isModelValid(model)) {
      return basicAnalysis;
    }

    const { stage: learnedStage, confidence: learnedConfidence } = classifyWithModel(
      model,
      basicAnalysis.avgHeartRate,
      basicAnalysis.heartRateVariability > 0 ? basicAnalysis.heartRateVariability : null
    );

    if (learnedConfidence > basicAnalysis.confidence) {
      return {
        ...basicAnalysis,
        estimatedStage: learnedStage,
        confidence: learnedConfidence,
      };
    }
  } catch (error) {
    console.error('Failed to use learned model:', error);
  }

  return basicAnalysis;
}

export function setUseLearnedModel(enabled: boolean): void {
  useLearnedModel = enabled;
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 3) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  const threshold = firstAvg * 0.05;

  if (diff > threshold) return 'increasing';
  if (diff < -threshold) return 'decreasing';
  return 'stable';
}

function calculateVariability(values: number[]): number {
  if (values.length < 2) return 0;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return avg > 0 ? stdDev / avg : 0;
}

function classifySleepStage(
  avgHR: number,
  avgHRV: number,
  hrTrend: 'increasing' | 'decreasing' | 'stable',
  hrvTrend: 'increasing' | 'decreasing' | 'stable',
  hrvVariability: number
): SleepStage {
  if (avgHR >= HR_AWAKE_MIN && avgHRV < HRV_AWAKE_MAX) {
    return 'awake';
  }

  if (avgHR <= HR_DEEP_SLEEP_MAX && avgHRV >= HRV_DEEP_SLEEP_MIN && hrTrend !== 'increasing') {
    return 'deep';
  }

  if (
    avgHR >= HR_REM_RANGE.min &&
    avgHR <= HR_REM_RANGE.max &&
    hrvVariability > HRV_REM_VARIABILITY_THRESHOLD
  ) {
    return 'rem';
  }

  if (
    avgHR <= HR_LIGHT_SLEEP_MAX &&
    avgHRV >= HRV_LIGHT_SLEEP_RANGE.min &&
    avgHRV <= HRV_LIGHT_SLEEP_RANGE.max
  ) {
    return 'light';
  }

  if (avgHR < HR_AWAKE_MIN) {
    return 'light';
  }

  return 'awake';
}

function calculateConfidence(hrCount: number, hrvCount: number, stage: SleepStage): number {
  const sampleConfidence = Math.min(1, (hrCount + hrvCount) / (MIN_SAMPLES_FOR_CLASSIFICATION * 4));

  const stageStability =
    stageConfidenceHistory.length > 0
      ? stageConfidenceHistory.filter((c) => c > 0.5).length / stageConfidenceHistory.length
      : 0.5;

  const hrvPresence = hrvCount > 0 ? 1 : 0.6;

  return sampleConfidence * stageStability * hrvPresence;
}

export function getCurrentVitalsStage(): SleepStage {
  const analysis = analyzeVitals();
  return analysis.confidence > 0.3 ? analysis.estimatedStage : lastClassifiedStage;
}

export function resetVitalsWindow(): void {
  vitalsWindow = {
    heartRates: [],
    hrvValues: [],
    timestamps: [],
  };
  lastClassifiedStage = 'awake';
  stageConfidenceHistory = [];
}

export function getVitalsWindowStats(): {
  sampleCount: number;
  hrCount: number;
  hrvCount: number;
  windowMinutes: number;
  lastStage: SleepStage;
} {
  const oldestTimestamp = vitalsWindow.timestamps[0];
  const newestTimestamp = vitalsWindow.timestamps[vitalsWindow.timestamps.length - 1];
  const windowMinutes =
    oldestTimestamp && newestTimestamp
      ? (newestTimestamp.getTime() - oldestTimestamp.getTime()) / 60000
      : 0;

  return {
    sampleCount: vitalsWindow.timestamps.length,
    hrCount: vitalsWindow.heartRates.length,
    hrvCount: vitalsWindow.hrvValues.length,
    windowMinutes,
    lastStage: lastClassifiedStage,
  };
}
