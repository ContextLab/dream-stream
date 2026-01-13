import { Platform } from 'react-native';
import type { SleepStage } from '@/types/database';
import * as healthConnect from './healthConnect';
import * as healthKit from './healthKit';
import { storage } from '@/lib/storage';

interface StageProfile {
  hrMean: number;
  hrStd: number;
  hrvMean: number;
  hrvStd: number;
  sampleCount: number;
}

interface LearnedModel {
  profiles: Record<SleepStage, StageProfile | null>;
  lastUpdated: string;
  nightsAnalyzed: number;
}

interface TimestampedValue {
  value: number;
  time: Date;
}

const STORAGE_KEY = 'sleep_stage_model';
const MIN_SAMPLES_PER_STAGE = 5;
const MODEL_VALID_HOURS = 24;

let cachedModel: LearnedModel | null = null;

function createEmptyModel(): LearnedModel {
  return {
    profiles: {
      awake: null,
      light: null,
      deep: null,
      rem: null,
      any: null,
    },
    lastUpdated: new Date().toISOString(),
    nightsAnalyzed: 0,
  };
}

export async function loadModel(): Promise<LearnedModel> {
  if (cachedModel) {
    return cachedModel;
  }

  const stored = await storage.get<LearnedModel>(STORAGE_KEY);
  if (stored) {
    cachedModel = stored;
    return stored;
  }

  return createEmptyModel();
}

export async function saveModel(model: LearnedModel): Promise<void> {
  cachedModel = model;
  await storage.set(STORAGE_KEY, model);
}

export function isModelValid(model: LearnedModel): boolean {
  const lastUpdated = new Date(model.lastUpdated);
  const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

  if (hoursSinceUpdate > MODEL_VALID_HOURS) {
    return false;
  }

  const hasAnyProfile = Object.values(model.profiles).some(
    (p) => p !== null && p.sampleCount >= MIN_SAMPLES_PER_STAGE
  );
  return hasAnyProfile;
}

export async function learnFromRecentNights(hoursBack: number = 48): Promise<LearnedModel> {
  const platform = Platform.OS;

  if (platform !== 'android' && platform !== 'ios') {
    return createEmptyModel();
  }

  try {
    const sleepStages =
      platform === 'ios'
        ? await healthKit.getRecentSleepSessions(hoursBack)
        : await healthConnect.getRecentSleepSessions(hoursBack);

    if (sleepStages.length === 0) {
      console.log('No sleep stages found for learning');
      return await loadModel();
    }

    const stageData: Record<SleepStage, { hrs: number[]; hrvs: number[] }> = {
      awake: { hrs: [], hrvs: [] },
      light: { hrs: [], hrvs: [] },
      deep: { hrs: [], hrvs: [] },
      rem: { hrs: [], hrvs: [] },
      any: { hrs: [], hrvs: [] },
    };

    const hrSamples =
      platform === 'ios'
        ? await healthKit.getRecentHeartRate(hoursBack * 60)
        : await healthConnect.getRecentHeartRate(hoursBack * 60);

    const hrvSamples =
      platform === 'ios'
        ? await healthKit.getRecentHRV(hoursBack * 60)
        : await healthConnect.getRecentHRV(hoursBack * 60);

    const hrByTime: TimestampedValue[] = hrSamples.map((s) => ({
      value: s.beatsPerMinute,
      time: new Date(s.time),
    }));

    const hrvByTime: TimestampedValue[] = hrvSamples.map((s) => ({
      value: s.heartRateVariabilityMillis,
      time: new Date(s.time),
    }));

    for (const stageRecord of sleepStages) {
      const stageStart = new Date(stageRecord.startTime);
      const stageEnd = new Date(stageRecord.endTime);
      const stage = stageRecord.stage as SleepStage;

      if (stage === 'any') continue;

      const matchingHr = hrByTime.filter((hr) => hr.time >= stageStart && hr.time <= stageEnd);

      const matchingHrv = hrvByTime.filter((hrv) => hrv.time >= stageStart && hrv.time <= stageEnd);

      for (const hr of matchingHr) {
        stageData[stage].hrs.push(hr.value);
      }

      for (const hrv of matchingHrv) {
        stageData[stage].hrvs.push(hrv.value);
      }
    }

    const profiles: Record<SleepStage, StageProfile | null> = {
      awake: null,
      light: null,
      deep: null,
      rem: null,
      any: null,
    };

    for (const [stage, data] of Object.entries(stageData) as [
      SleepStage,
      { hrs: number[]; hrvs: number[] },
    ][]) {
      if (data.hrs.length >= MIN_SAMPLES_PER_STAGE) {
        profiles[stage] = {
          hrMean: mean(data.hrs),
          hrStd: std(data.hrs),
          hrvMean: data.hrvs.length > 0 ? mean(data.hrvs) : 0,
          hrvStd: data.hrvs.length > 0 ? std(data.hrvs) : 0,
          sampleCount: data.hrs.length,
        };
      }
    }

    const model: LearnedModel = {
      profiles,
      lastUpdated: new Date().toISOString(),
      nightsAnalyzed: countNights(sleepStages.map((s) => new Date(s.startTime))),
    };

    await saveModel(model);
    console.log('Sleep stage model updated:', {
      awake: model.profiles.awake?.sampleCount ?? 0,
      light: model.profiles.light?.sampleCount ?? 0,
      deep: model.profiles.deep?.sampleCount ?? 0,
      rem: model.profiles.rem?.sampleCount ?? 0,
    });

    return model;
  } catch (error) {
    console.error('Failed to learn from recent nights:', error);
    return await loadModel();
  }
}

export function classifyWithModel(
  model: LearnedModel,
  heartRate: number,
  hrv: number | null
): { stage: SleepStage; confidence: number } {
  if (!isModelValid(model)) {
    return { stage: 'awake', confidence: 0 };
  }

  const scores: { stage: SleepStage; score: number }[] = [];

  for (const [stage, profile] of Object.entries(model.profiles) as [
    SleepStage,
    StageProfile | null,
  ][]) {
    if (!profile || stage === 'any') continue;

    const hrScore = gaussianScore(heartRate, profile.hrMean, profile.hrStd);

    let hrvScore = 0.5;
    if (hrv !== null && profile.hrvMean > 0 && profile.hrvStd > 0) {
      hrvScore = gaussianScore(hrv, profile.hrvMean, profile.hrvStd);
    }

    const weight = Math.min(1, profile.sampleCount / 20);
    const combinedScore = (hrScore * 0.6 + hrvScore * 0.4) * weight;

    scores.push({ stage, score: combinedScore });
  }

  if (scores.length === 0) {
    return { stage: 'awake', confidence: 0 };
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];

  let confidence = best.score;
  if (second) {
    const separation = best.score - second.score;
    confidence = Math.min(1, best.score + separation);
  }

  return { stage: best.stage, confidence };
}

export async function classifyCurrentVitals(
  heartRate: number,
  hrv: number | null
): Promise<{ stage: SleepStage; confidence: number; modelBased: boolean }> {
  const model = await loadModel();

  if (!isModelValid(model)) {
    return { stage: 'awake', confidence: 0, modelBased: false };
  }

  const result = classifyWithModel(model, heartRate, hrv);
  return { ...result, modelBased: true };
}

export async function refreshModelIfNeeded(): Promise<boolean> {
  const model = await loadModel();

  if (!isModelValid(model)) {
    await learnFromRecentNights(48);
    return true;
  }

  return false;
}

export async function getModelStats(): Promise<{
  hasModel: boolean;
  isValid: boolean;
  nightsAnalyzed: number;
  lastUpdated: string | null;
  stageStats: Record<SleepStage, number>;
}> {
  const model = await loadModel();

  const stageStats: Record<SleepStage, number> = {
    awake: model.profiles.awake?.sampleCount ?? 0,
    light: model.profiles.light?.sampleCount ?? 0,
    deep: model.profiles.deep?.sampleCount ?? 0,
    rem: model.profiles.rem?.sampleCount ?? 0,
    any: 0,
  };

  const hasModel = Object.values(stageStats).some((count) => count > 0);

  return {
    hasModel,
    isValid: isModelValid(model),
    nightsAnalyzed: model.nightsAnalyzed,
    lastUpdated: hasModel ? model.lastUpdated : null,
    stageStats,
  };
}

export async function clearModel(): Promise<void> {
  cachedModel = null;
  await storage.remove(STORAGE_KEY);
}

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

function gaussianScore(value: number, mean: number, std: number): number {
  if (std === 0) {
    return value === mean ? 1 : 0;
  }
  const zScore = Math.abs(value - mean) / std;
  return Math.exp(-0.5 * zScore * zScore);
}

function countNights(timestamps: Date[]): number {
  const uniqueDays = new Set<string>();
  for (const ts of timestamps) {
    const dayKey = ts.toISOString().split('T')[0];
    uniqueDays.add(dayKey);
  }
  return uniqueDays.size;
}

export interface DebugReport {
  timestamp: string;
  platform: string;
  sleepStages: {
    total: number;
    byStage: Record<string, number>;
    samples: Array<{ stage: string; start: string; end: string; durationMin: number }>;
  };
  heartRate: {
    total: number;
    oldest: string | null;
    newest: string | null;
    samples: Array<{ bpm: number; time: string }>;
  };
  hrv: {
    total: number;
    oldest: string | null;
    newest: string | null;
    samples: Array<{ ms: number; time: string }>;
  };
  matching: {
    stagesWithHR: Record<string, number>;
    stagesWithHRV: Record<string, number>;
  };
  model: LearnedModel | null;
  errors: string[];
}

export async function runDebugReport(hoursBack: number = 48): Promise<DebugReport> {
  const platform = Platform.OS;
  const errors: string[] = [];
  const report: DebugReport = {
    timestamp: new Date().toISOString(),
    platform,
    sleepStages: { total: 0, byStage: {}, samples: [] },
    heartRate: { total: 0, oldest: null, newest: null, samples: [] },
    hrv: { total: 0, oldest: null, newest: null, samples: [] },
    matching: { stagesWithHR: {}, stagesWithHRV: {} },
    model: null,
    errors: [],
  };

  if (platform !== 'android' && platform !== 'ios') {
    errors.push(`Unsupported platform: ${platform}`);
    report.errors = errors;
    return report;
  }

  try {
    const sleepStages =
      platform === 'ios'
        ? await healthKit.getRecentSleepSessions(hoursBack)
        : await healthConnect.getRecentSleepSessions(hoursBack);

    report.sleepStages.total = sleepStages.length;

    const byStage: Record<string, number> = {};
    for (const s of sleepStages) {
      byStage[s.stage] = (byStage[s.stage] || 0) + 1;
    }
    report.sleepStages.byStage = byStage;

    report.sleepStages.samples = sleepStages.slice(0, 20).map((s) => ({
      stage: s.stage,
      start: s.startTime,
      end: s.endTime,
      durationMin: Math.round(
        (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000
      ),
    }));

    const hrSamples =
      platform === 'ios'
        ? await healthKit.getRecentHeartRate(hoursBack * 60)
        : await healthConnect.getRecentHeartRate(hoursBack * 60);

    report.heartRate.total = hrSamples.length;
    if (hrSamples.length > 0) {
      const sorted = [...hrSamples].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      report.heartRate.oldest = sorted[0].time;
      report.heartRate.newest = sorted[sorted.length - 1].time;
      report.heartRate.samples = hrSamples.slice(0, 10).map((s) => ({
        bpm: s.beatsPerMinute,
        time: s.time,
      }));
    }

    const hrvSamples =
      platform === 'ios'
        ? await healthKit.getRecentHRV(hoursBack * 60)
        : await healthConnect.getRecentHRV(hoursBack * 60);

    report.hrv.total = hrvSamples.length;
    if (hrvSamples.length > 0) {
      const sorted = [...hrvSamples].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      report.hrv.oldest = sorted[0].time;
      report.hrv.newest = sorted[sorted.length - 1].time;
      report.hrv.samples = hrvSamples.slice(0, 10).map((s) => ({
        ms: s.heartRateVariabilityMillis,
        time: s.time,
      }));
    }

    const stagesWithHR: Record<string, number> = {};
    const stagesWithHRV: Record<string, number> = {};

    for (const stageRecord of sleepStages) {
      const stageStart = new Date(stageRecord.startTime);
      const stageEnd = new Date(stageRecord.endTime);
      const stage = stageRecord.stage;

      const matchingHr = hrSamples.filter((hr) => {
        const t = new Date(hr.time);
        return t >= stageStart && t <= stageEnd;
      });
      stagesWithHR[stage] = (stagesWithHR[stage] || 0) + matchingHr.length;

      const matchingHrv = hrvSamples.filter((hrv) => {
        const t = new Date(hrv.time);
        return t >= stageStart && t <= stageEnd;
      });
      stagesWithHRV[stage] = (stagesWithHRV[stage] || 0) + matchingHrv.length;
    }

    report.matching.stagesWithHR = stagesWithHR;
    report.matching.stagesWithHRV = stagesWithHRV;

    report.model = await loadModel();
  } catch (error) {
    errors.push(`Error: ${error}`);
  }

  report.errors = errors;
  return report;
}

export function formatDebugReport(report: DebugReport): string {
  const lines: string[] = [];

  lines.push(`=== Sleep Stage Learning Debug Report ===`);
  lines.push(`Time: ${report.timestamp}`);
  lines.push(`Platform: ${report.platform}`);
  lines.push('');

  lines.push(`--- Sleep Stages ---`);
  lines.push(`Total stages: ${report.sleepStages.total}`);
  lines.push(`By stage: ${JSON.stringify(report.sleepStages.byStage)}`);
  if (report.sleepStages.samples.length > 0) {
    lines.push(`Recent samples:`);
    for (const s of report.sleepStages.samples.slice(0, 5)) {
      lines.push(`  ${s.stage}: ${s.durationMin}min (${s.start})`);
    }
  }
  lines.push('');

  lines.push(`--- Heart Rate ---`);
  lines.push(`Total samples: ${report.heartRate.total}`);
  if (report.heartRate.oldest && report.heartRate.newest) {
    lines.push(`Range: ${report.heartRate.oldest} to ${report.heartRate.newest}`);
  }
  if (report.heartRate.samples.length > 0) {
    lines.push(`Recent: ${report.heartRate.samples.map((s) => s.bpm).join(', ')} bpm`);
  }
  lines.push('');

  lines.push(`--- HRV ---`);
  lines.push(`Total samples: ${report.hrv.total}`);
  if (report.hrv.oldest && report.hrv.newest) {
    lines.push(`Range: ${report.hrv.oldest} to ${report.hrv.newest}`);
  }
  if (report.hrv.samples.length > 0) {
    lines.push(`Recent: ${report.hrv.samples.map((s) => s.ms).join(', ')} ms`);
  }
  lines.push('');

  lines.push(`--- Matching (HR/HRV samples per sleep stage) ---`);
  lines.push(`HR per stage: ${JSON.stringify(report.matching.stagesWithHR)}`);
  lines.push(`HRV per stage: ${JSON.stringify(report.matching.stagesWithHRV)}`);
  lines.push('');

  lines.push(`--- Learned Model ---`);
  if (report.model) {
    lines.push(`Last updated: ${report.model.lastUpdated}`);
    lines.push(`Nights analyzed: ${report.model.nightsAnalyzed}`);
    for (const [stage, profile] of Object.entries(report.model.profiles)) {
      if (profile && stage !== 'any') {
        lines.push(
          `  ${stage}: HR=${profile.hrMean.toFixed(1)}±${profile.hrStd.toFixed(1)}, HRV=${profile.hrvMean.toFixed(1)}±${profile.hrvStd.toFixed(1)} (n=${profile.sampleCount})`
        );
      }
    }
  } else {
    lines.push('No model loaded');
  }
  lines.push('');

  if (report.errors.length > 0) {
    lines.push(`--- Errors ---`);
    for (const e of report.errors) {
      lines.push(`  ${e}`);
    }
  }

  return lines.join('\n');
}
