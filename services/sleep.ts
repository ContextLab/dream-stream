import { Platform } from 'react-native';
import Meyda from 'meyda';
import type { MeydaFeaturesObject } from 'meyda';
import type { SleepStage } from '@/types/database';
import { storage } from '@/lib/storage';
import { addVitalsSample, resetVitalsWindow } from './vitalsClassifier';
import { learnFromRecentNights } from './sleepStageLearning';
import { getCurrentVitals, getHealthConnectStatus, type VitalsSnapshot } from './healthConnect';
import {
  classifyHybrid,
  startHybridSession,
  stopHybridSession,
  type HybridClassification,
} from './hybridClassifier';
import {
  startNativeAudioCapture,
  stopNativeAudioCapture,
  isNativeAudioAvailable,
} from './nativeAudio';

export type SleepTrackingSource = 'audio' | 'wearable' | 'manual';

export interface SleepSession {
  id: string;
  startTime: string;
  endTime: string | null;
  currentStage: SleepStage;
  source: SleepTrackingSource;
  stages: SleepStageRecord[];
  isActive: boolean;
}

export interface SleepStageRecord {
  stage: SleepStage;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
}

export interface SleepSummary {
  totalDurationMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  awakeMinutes: number;
  remPercentage: number;
  sleepEfficiency: number;
}

export interface BreathingAnalysis {
  isBreathingDetected: boolean;
  breathsPerMinute: number;
  regularity: number;
  amplitude: number;
  respiratoryRateVariability: number;
  movementIntensity: number;
  confidenceScore: number;
  estimatedStage: SleepStage;
  recentBreathTimes: number[];
  lastBreathTime: number | null;
}

interface MeydaAnalyzerInstance {
  start: () => void;
  stop: () => void;
}

type SleepStageCallback = (stage: SleepStage) => void;

const STORAGE_KEY_SESSION = 'current_sleep_session';
const STORAGE_KEY_HISTORY = 'sleep_history';
const BREATHING_RATE_MIN = 8;
const BREATHING_RATE_MAX = 25;
const ANALYSIS_WINDOW_MS = 60000;
const CALIBRATION_WINDOW_MS = 10000;
const BASE_RMS_THRESHOLD = 0.02;
const MIN_RMS_THRESHOLD = 0.005;
const MAX_RMS_THRESHOLD = 0.15;
const THRESHOLD_MULTIPLIER = 1.5;
const DROWSY_BREATHING_REGULARITY = 0.7;
const SLEEP_BREATHING_REGULARITY = 0.85;
const REM_RRV_THRESHOLD = 0.25;
const DEEP_SLEEP_RRV_THRESHOLD = 0.1;
const MOVEMENT_THRESHOLD = 0.15;
const MOVEMENT_SPIKE_THRESHOLD = 3.0;
const HR_MOVEMENT_DELTA_THRESHOLD = 8;
const HR_MOVEMENT_WINDOW_SEC = 30;

const BANDPASS_LOW_FREQ = 100;
const BANDPASS_HIGH_FREQ = 800;
const BANDPASS_Q = 0.7;

let currentSession: SleepSession | null = null;
let recentHRSamples: { hr: number; timestamp: number }[] = [];
let hrMovementScore = 0;
let audioContext: AudioContext | null = null;
let bandpassFilter: BiquadFilterNode | null = null;
let analyzer: MeydaAnalyzerInstance | null = null;
let mediaStream: MediaStream | null = null;
let isAudioRunning = false;
const stageCallbacks: Set<SleepStageCallback> = new Set();
let rmsHistory: { value: number; timestamp: number }[] = [];
let peakTimestamps: number[] = [];
let breathIntervals: number[] = [];
let stageHistory: { stage: SleepStage; timestamp: number }[] = [];
let remCallbacks: Set<() => void> = new Set();
let remEndCallbacks: Set<() => void> = new Set();
let adaptiveRmsThreshold = BASE_RMS_THRESHOLD;
let calibrationRmsValues: number[] = [];
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL_MS = 30000;

const AGC_WINDOW_MS = 60000;
const AGC_UPDATE_INTERVAL_MS = 1000;
const AGC_OUTPUT_MIN = 0.05;
const AGC_OUTPUT_MAX = 0.95;
const AGC_MIN_GAIN = 0.1;
const AGC_MAX_GAIN = 20.0;
let agcHistory: { rms: number; timestamp: number }[] = [];
let agcInputMin = 0;
let agcInputMax = 1;
let agcLastUpdateTime = 0;
let agcEnabled = true;
let lastBreathingAnalysis: BreathingAnalysis | null = null;

function generateId(): string {
  return `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function startSleepSession(
  source: SleepTrackingSource = 'manual'
): Promise<SleepSession> {
  if (currentSession?.isActive) {
    return currentSession;
  }

  learnFromRecentNights(48).catch(console.error);
  await startHybridSession();

  const session: SleepSession = {
    id: generateId(),
    startTime: new Date().toISOString(),
    endTime: null,
    currentStage: 'awake',
    source,
    stages: [
      {
        stage: 'awake',
        startTime: new Date().toISOString(),
        endTime: null,
        durationMinutes: 0,
      },
    ],
    isActive: true,
  };

  currentSession = session;
  await storage.set(STORAGE_KEY_SESSION, session);

  stageHistory = [{ stage: 'awake', timestamp: Date.now() }];
  notifyStageHistoryChange();

  startHeartbeat();

  if (source === 'audio') {
    await startAudioDetection();
  }

  return session;
}

export async function endSleepSession(): Promise<SleepSession | null> {
  if (!currentSession) return null;

  stopHeartbeat();
  stopAudioDetection();
  stopHybridSession();

  const endTime = new Date().toISOString();

  if (currentSession.stages.length > 0) {
    const lastStage = currentSession.stages[currentSession.stages.length - 1];
    lastStage.endTime = endTime;
    lastStage.durationMinutes = calculateDuration(lastStage.startTime, endTime);
  }

  currentSession.endTime = endTime;
  currentSession.isActive = false;

  const history = await getSleepHistory();
  history.unshift(currentSession);
  await storage.set(STORAGE_KEY_HISTORY, history.slice(0, 30));
  await storage.remove(STORAGE_KEY_SESSION);

  const endedSession = currentSession;
  currentSession = null;

  return endedSession;
}

export async function getCurrentSession(): Promise<SleepSession | null> {
  if (currentSession) return currentSession;

  const stored = await storage.get<SleepSession>(STORAGE_KEY_SESSION);
  if (stored?.isActive) {
    currentSession = stored;
    return stored;
  }
  return null;
}

export function updateSleepStage(stage: SleepStage): void {
  if (!currentSession || !currentSession.isActive) return;

  const now = new Date().toISOString();

  if (currentSession.stages.length > 0) {
    const lastStage = currentSession.stages[currentSession.stages.length - 1];
    if (lastStage.stage === stage) return;

    lastStage.endTime = now;
    lastStage.durationMinutes = calculateDuration(lastStage.startTime, now);
  }

  currentSession.stages.push({
    stage,
    startTime: now,
    endTime: null,
    durationMinutes: 0,
  });

  currentSession.currentStage = stage;
  storage.set(STORAGE_KEY_SESSION, currentSession);

  stageCallbacks.forEach((cb) => cb(stage));
}

export function getCurrentStage(): SleepStage | null {
  return currentSession?.currentStage ?? null;
}

export function isInTargetStage(targetStage: SleepStage): boolean {
  if (!currentSession) return false;
  if (targetStage === 'any') return true;
  return currentSession.currentStage === targetStage;
}

export function onSleepStageChange(callback: SleepStageCallback): () => void {
  stageCallbacks.add(callback);
  return () => stageCallbacks.delete(callback);
}

export function onRemStart(callback: () => void): () => void {
  remCallbacks.add(callback);
  return () => remCallbacks.delete(callback);
}

export function onRemEnd(callback: () => void): () => void {
  remEndCallbacks.add(callback);
  return () => remEndCallbacks.delete(callback);
}

export async function getSleepHistory(): Promise<SleepSession[]> {
  const history = await storage.get<SleepSession[]>(STORAGE_KEY_HISTORY);
  return history ?? [];
}

export async function deleteSleepSession(sessionId: string): Promise<boolean> {
  const history = await getSleepHistory();
  const filtered = history.filter((s) => s.id !== sessionId);
  if (filtered.length === history.length) {
    return false;
  }
  await storage.set(STORAGE_KEY_HISTORY, filtered);
  return true;
}

export function calculateSleepSummary(session: SleepSession): SleepSummary {
  let remMinutes = 0;
  let lightMinutes = 0;
  let deepMinutes = 0;
  let awakeMinutes = 0;

  for (const record of session.stages) {
    const duration = record.durationMinutes || 0;
    switch (record.stage) {
      case 'rem':
        remMinutes += duration;
        break;
      case 'light':
        lightMinutes += duration;
        break;
      case 'deep':
        deepMinutes += duration;
        break;
      case 'awake':
        awakeMinutes += duration;
        break;
    }
  }

  const totalDurationMinutes = remMinutes + lightMinutes + deepMinutes + awakeMinutes;
  const sleepMinutes = totalDurationMinutes - awakeMinutes;

  return {
    totalDurationMinutes,
    remMinutes,
    lightMinutes,
    deepMinutes,
    awakeMinutes,
    remPercentage:
      totalDurationMinutes > 0 ? Math.round((remMinutes / totalDurationMinutes) * 100) : 0,
    sleepEfficiency:
      totalDurationMinutes > 0 ? Math.round((sleepMinutes / totalDurationMinutes) * 100) : 0,
  };
}

export function getSleepStageDisplayName(stage: SleepStage): string {
  const names: Record<SleepStage, string> = {
    awake: 'Awake',
    light: 'Light Sleep',
    deep: 'Deep Sleep',
    rem: 'REM Sleep',
    any: 'Any Stage',
  };
  return names[stage];
}

export function getSleepStageColor(stage: SleepStage): string {
  const colors: Record<SleepStage, string> = {
    awake: '#EF4444',
    light: '#3B82F6',
    deep: '#8B5CF6',
    rem: '#22C55E',
    any: '#6B7280',
  };
  return colors[stage];
}

function calculateDuration(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

async function startAudioDetection(): Promise<boolean> {
  if (isAudioRunning) return true;

  if (isNativeAudioAvailable()) {
    return startNativeAudioDetection();
  }

  return startWebAudioDetection();
}

async function startNativeAudioDetection(): Promise<boolean> {
  try {
    const success = await startNativeAudioCapture((rms: number) => {
      processRmsValue(rms);
    });

    if (success) {
      isAudioRunning = true;
    }

    return success;
  } catch (error) {
    console.error('Failed to start native audio detection:', error);
    return false;
  }
}

async function startWebAudioDetection(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.mediaDevices) {
    console.warn('Audio capture not available');
    return false;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);

    const centerFreq = Math.sqrt(BANDPASS_LOW_FREQ * BANDPASS_HIGH_FREQ);
    bandpassFilter = audioContext.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = centerFreq;
    bandpassFilter.Q.value = BANDPASS_Q;

    source.connect(bandpassFilter);

    analyzer = Meyda.createMeydaAnalyzer({
      audioContext,
      source: bandpassFilter,
      bufferSize: 2048,
      featureExtractors: ['rms', 'zcr', 'spectralCentroid', 'spectralFlatness'],
      callback: processAudioFeatures,
    });

    analyzer.start();
    isAudioRunning = true;

    return true;
  } catch (error) {
    console.error('Failed to start web audio detection:', error);
    return false;
  }
}

function stopAudioDetection(): void {
  stopHeartbeat();

  if (isNativeAudioAvailable()) {
    stopNativeAudioCapture();
  }

  if (analyzer) {
    analyzer.stop();
    analyzer = null;
  }

  if (bandpassFilter) {
    bandpassFilter.disconnect();
    bandpassFilter = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  isAudioRunning = false;
  rmsHistory = [];
  peakTimestamps = [];
  breathIntervals = [];
  stageHistory = [];
  calibrationRmsValues = [];
  adaptiveRmsThreshold = BASE_RMS_THRESHOLD;
  agcHistory = [];
  agcInputMin = 0;
  agcInputMax = 1;
  agcLastUpdateTime = 0;
}

function startHeartbeat(): void {
  stopHeartbeat();

  setTimeout(() => {
    if (currentSession?.isActive && currentSession.currentStage) {
      const now = Date.now();
      stageHistory.push({ stage: currentSession.currentStage, timestamp: now });
      notifyStageHistoryChange();
    }
  }, 5000);

  heartbeatInterval = setInterval(() => {
    if (currentSession?.isActive && currentSession.currentStage) {
      const now = Date.now();
      const lastEntry = stageHistory[stageHistory.length - 1];
      if (!lastEntry || now - lastEntry.timestamp >= HEARTBEAT_INTERVAL_MS - 1000) {
        stageHistory.push({ stage: currentSession.currentStage, timestamp: now });
        stageHistory = stageHistory.filter((s) => now - s.timestamp < 3600000);
        notifyStageHistoryChange();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function recalibrateThreshold(): void {
  if (calibrationRmsValues.length < 50) return;

  const sorted = [...calibrationRmsValues].sort((a, b) => a - b);
  const medianIdx = Math.floor(sorted.length / 2);
  const median = sorted[medianIdx];
  const p75Idx = Math.floor(sorted.length * 0.75);
  const p75 = sorted[p75Idx];

  const noiseFloor = median;
  const signalEstimate = p75;
  const dynamicRange = signalEstimate - noiseFloor;

  if (dynamicRange > 0.001) {
    const newThreshold = noiseFloor + dynamicRange * THRESHOLD_MULTIPLIER;
    adaptiveRmsThreshold = Math.max(MIN_RMS_THRESHOLD, Math.min(MAX_RMS_THRESHOLD, newThreshold));
  }

  calibrationRmsValues = calibrationRmsValues.slice(-100);
}

function applyAGC(rawRms: number): number {
  if (!agcEnabled) return rawRms;

  const now = Date.now();

  agcHistory.push({ rms: rawRms, timestamp: now });
  agcHistory = agcHistory.filter((entry) => now - entry.timestamp < AGC_WINDOW_MS);

  if (now - agcLastUpdateTime >= AGC_UPDATE_INTERVAL_MS) {
    agcLastUpdateTime = now;
    updateAGCRange();
  }

  if (agcHistory.length < 10) {
    return rawRms;
  }

  const inputRange = agcInputMax - agcInputMin;
  if (inputRange < 0.001) {
    return rawRms;
  }

  const normalizedPosition = (rawRms - agcInputMin) / inputRange;
  const clampedPosition = Math.max(0, Math.min(1, normalizedPosition));

  const outputRange = AGC_OUTPUT_MAX - AGC_OUTPUT_MIN;
  const adjustedRms = AGC_OUTPUT_MIN + clampedPosition * outputRange;

  return adjustedRms;
}

function updateAGCRange(): void {
  if (agcHistory.length < 10) return;

  const values = agcHistory.map((h) => h.rms).filter((v) => v > 0.0001);
  if (values.length < 5) return;

  const sorted = [...values].sort((a, b) => a - b);

  const p5Idx = Math.floor(sorted.length * 0.05);
  const p95Idx = Math.floor(sorted.length * 0.95);
  const newMin = sorted[p5Idx];
  const newMax = sorted[p95Idx];

  if (newMax - newMin < 0.001) return;

  const smoothing = 0.7;
  agcInputMin = agcInputMin * smoothing + newMin * (1 - smoothing);
  agcInputMax = agcInputMax * smoothing + newMax * (1 - smoothing);

  agcInputMin = Math.max(0, agcInputMin);
  agcInputMax = Math.min(1, Math.max(agcInputMin + 0.01, agcInputMax));
}

export function setAGCEnabled(enabled: boolean): void {
  agcEnabled = enabled;
  if (!enabled) {
    agcHistory = [];
    agcInputMin = 0;
    agcInputMax = 1;
  }
}

export function getAGCStatus(): {
  enabled: boolean;
  currentGain: number;
  historySize: number;
  inputRange: [number, number];
} {
  const inputRange = agcInputMax - agcInputMin;
  const effectiveGain = inputRange > 0 ? (AGC_OUTPUT_MAX - AGC_OUTPUT_MIN) / inputRange : 1;

  return {
    enabled: agcEnabled,
    currentGain: effectiveGain,
    historySize: agcHistory.length,
    inputRange: [agcInputMin, agcInputMax],
  };
}

function processRmsValue(rawRms: number): void {
  const now = Date.now();

  const rms = applyAGC(rawRms);

  notifyRawAudioLevel(rms);

  calibrationRmsValues.push(rms);
  if (calibrationRmsValues.length % 50 === 0) {
    recalibrateThreshold();
  }

  rmsHistory.push({ value: rms, timestamp: now });
  rmsHistory = rmsHistory.filter((entry) => now - entry.timestamp < ANALYSIS_WINDOW_MS);

  if (rms > adaptiveRmsThreshold) {
    const lastPeak = peakTimestamps[peakTimestamps.length - 1];
    if (!lastPeak || now - lastPeak > 1500) {
      peakTimestamps.push(now);
    }
  }

  peakTimestamps = peakTimestamps.filter((ts) => now - ts < ANALYSIS_WINDOW_MS);

  if (rmsHistory.length > 20) {
    const analysis = analyzeBreathing();
    lastBreathingAnalysis = analysis;

    notifyBreathingAnalysis(analysis);

    if (!calibrationMode && currentSession && currentSession.currentStage) {
      updateStageFromAudio(analysis);
    }
  }
}

function processAudioFeatures(features: Partial<MeydaFeaturesObject>): void {
  processRmsValue(features.rms ?? 0);
}

function calculateRRV(intervals: number[]): number {
  if (intervals.length < 3) return 0;

  const differences: number[] = [];
  for (let i = 1; i < intervals.length; i++) {
    differences.push(Math.abs(intervals[i] - intervals[i - 1]));
  }

  const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  return avgInterval > 0 ? avgDiff / avgInterval : 0;
}

function detectMovement(rmsValues: number[]): number {
  if (rmsValues.length < 5) return 0;

  const sorted = [...rmsValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const baselineRms = (median + p25) / 2;

  let spikeScore = 0;
  let sustainedHighScore = 0;

  for (let i = 0; i < rmsValues.length; i++) {
    const rms = rmsValues[i];
    const spikeRatio = baselineRms > 0.001 ? rms / baselineRms : 0;

    if (spikeRatio > MOVEMENT_SPIKE_THRESHOLD) {
      spikeScore += 0.2;
    }

    if (rms > adaptiveRmsThreshold * 2) {
      sustainedHighScore += 0.05;
    }
  }

  const audioMovement = Math.min(1, spikeScore + sustainedHighScore);
  const combinedMovement = Math.max(audioMovement, hrMovementScore * 0.8);

  return combinedMovement;
}

export function addHRSample(hr: number): void {
  const now = Date.now();
  recentHRSamples.push({ hr, timestamp: now });
  recentHRSamples = recentHRSamples.filter(
    (s) => now - s.timestamp < HR_MOVEMENT_WINDOW_SEC * 1000
  );

  updateHRMovementScore();
}

function updateHRMovementScore(): void {
  if (recentHRSamples.length < 3) {
    hrMovementScore = 0;
    return;
  }

  const sorted = [...recentHRSamples].sort((a, b) => a.timestamp - b.timestamp);
  let maxDelta = 0;

  for (let i = 1; i < sorted.length; i++) {
    const timeDiff = sorted[i].timestamp - sorted[i - 1].timestamp;
    if (timeDiff > 0 && timeDiff < 60000) {
      const hrDelta = Math.abs(sorted[i].hr - sorted[i - 1].hr);
      maxDelta = Math.max(maxDelta, hrDelta);
    }
  }

  const minHR = Math.min(...sorted.map((s) => s.hr));
  const maxHR = Math.max(...sorted.map((s) => s.hr));
  const hrRange = maxHR - minHR;

  if (maxDelta >= HR_MOVEMENT_DELTA_THRESHOLD || hrRange >= HR_MOVEMENT_DELTA_THRESHOLD * 1.5) {
    hrMovementScore = Math.min(1, maxDelta / HR_MOVEMENT_DELTA_THRESHOLD);
  } else {
    hrMovementScore = hrMovementScore * 0.9;
  }
}

export function getMovementIndicators(): {
  audioMovement: number;
  hrMovement: number;
  combined: number;
} {
  const recentRms = rmsHistory.slice(-20).map((r) => r.value);
  const audioMovement = recentRms.length > 0 ? detectMovement(recentRms) : 0;

  return {
    audioMovement,
    hrMovement: hrMovementScore,
    combined: Math.max(audioMovement, hrMovementScore * 0.8),
  };
}

function analyzeBreathing(): BreathingAnalysis {
  const now = Date.now();
  const recentBreaths = peakTimestamps.filter((t) => now - t < 30000);
  const lastBreath = recentBreaths.length > 0 ? recentBreaths[recentBreaths.length - 1] : null;

  if (peakTimestamps.length < 3) {
    return {
      isBreathingDetected: false,
      breathsPerMinute: 0,
      regularity: 0,
      amplitude: 0,
      respiratoryRateVariability: 0,
      movementIntensity: 0,
      confidenceScore: 0,
      estimatedStage: 'awake',
      recentBreathTimes: recentBreaths,
      lastBreathTime: lastBreath,
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < peakTimestamps.length; i++) {
    intervals.push(peakTimestamps[i] - peakTimestamps[i - 1]);
  }

  breathIntervals = [...breathIntervals.slice(-20), ...intervals].slice(-30);

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const breathsPerMinute = 60000 / avgInterval;

  const variance =
    intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);
  const regularity = Math.max(0, 1 - stdDev / avgInterval);

  const recentRms = rmsHistory.slice(-20);
  const amplitude = Math.max(...recentRms.map((r) => r.value));

  const rrv = calculateRRV(breathIntervals);
  const movementIntensity = detectMovement(recentRms.map((r) => r.value));

  const isBreathingDetected =
    breathsPerMinute >= BREATHING_RATE_MIN &&
    breathsPerMinute <= BREATHING_RATE_MAX &&
    regularity > 0.3;

  const confidenceScore = isBreathingDetected
    ? Math.min(1, (peakTimestamps.length / 10) * regularity)
    : 0;

  const result: BreathingAnalysis = {
    isBreathingDetected,
    breathsPerMinute: isBreathingDetected ? breathsPerMinute : 0,
    regularity,
    amplitude,
    respiratoryRateVariability: rrv,
    movementIntensity,
    confidenceScore,
    estimatedStage: 'awake',
    recentBreathTimes: recentBreaths,
    lastBreathTime: lastBreath,
  };

  result.estimatedStage = inferSleepStage(result);

  return result;
}

function inferSleepStage(analysis: BreathingAnalysis): SleepStage {
  if (!analysis.isBreathingDetected) {
    return 'awake';
  }

  if (analysis.movementIntensity > MOVEMENT_THRESHOLD) {
    return 'awake';
  }

  if (analysis.regularity < DROWSY_BREATHING_REGULARITY) {
    return 'awake';
  }

  if (
    analysis.respiratoryRateVariability > REM_RRV_THRESHOLD &&
    analysis.breathsPerMinute > 16 &&
    analysis.movementIntensity < MOVEMENT_THRESHOLD * 0.5
  ) {
    return 'rem';
  }

  if (
    analysis.respiratoryRateVariability < DEEP_SLEEP_RRV_THRESHOLD &&
    analysis.breathsPerMinute < 12 &&
    analysis.regularity > SLEEP_BREATHING_REGULARITY
  ) {
    return 'deep';
  }

  if (analysis.regularity < SLEEP_BREATHING_REGULARITY) {
    return 'light';
  }

  return 'light';
}

const MIN_REM_CONFIDENCE_FOR_PLAYBACK = 0.5;

function handleStageTransition(
  previousStage: SleepStage,
  newStage: SleepStage,
  remConfidence: number
): void {
  const now = Date.now();
  stageHistory.push({ stage: newStage, timestamp: now });
  stageHistory = stageHistory.filter((s) => now - s.timestamp < 3600000);

  notifyStageHistoryChange();

  if (newStage === 'rem' && previousStage !== 'rem') {
    if (remConfidence >= MIN_REM_CONFIDENCE_FOR_PLAYBACK) {
      remCallbacks.forEach((cb) => cb());
    } else {
      console.log(
        `[Sleep] REM detected but confidence ${remConfidence.toFixed(2)} < ${MIN_REM_CONFIDENCE_FOR_PLAYBACK}, skipping playback`
      );
    }
  }

  if (previousStage === 'rem' && newStage !== 'rem') {
    remEndCallbacks.forEach((cb) => cb());
  }
}

async function updateStageFromAudio(analysis: BreathingAnalysis): Promise<void> {
  if (!currentSession?.isActive) return;

  const vitals = await getCurrentVitals();
  const hybrid = await classifyHybrid(analysis, vitals);

  if (hybrid.predictedStage !== currentSession.currentStage) {
    const previousStage = currentSession.currentStage;
    updateSleepStage(hybrid.predictedStage);
    handleStageTransition(previousStage, hybrid.predictedStage, hybrid.remConfidence);
  }
}

export function shouldTriggerDream(stage: SleepStage): boolean {
  return stage === 'light' || stage === 'rem';
}

export interface StageHistoryEntry {
  stage: SleepStage;
  timestamp: number;
}

export function getStageHistory(): StageHistoryEntry[] {
  return [...stageHistory];
}

type StageHistoryCallback = (history: StageHistoryEntry[]) => void;
const stageHistoryCallbacks: Set<StageHistoryCallback> = new Set();

type BreathingAnalysisCallback = (analysis: BreathingAnalysis) => void;
const breathingCallbacks: Set<BreathingAnalysisCallback> = new Set();
let calibrationMode = false;

export function onStageHistoryChange(callback: StageHistoryCallback): () => void {
  stageHistoryCallbacks.add(callback);
  callback(getStageHistory());
  return () => stageHistoryCallbacks.delete(callback);
}

function notifyStageHistoryChange(): void {
  const history = getStageHistory();
  stageHistoryCallbacks.forEach((cb) => cb(history));
}

export function onBreathingAnalysis(callback: BreathingAnalysisCallback): () => void {
  breathingCallbacks.add(callback);
  return () => breathingCallbacks.delete(callback);
}

type RawAudioCallback = (rms: number) => void;
const rawAudioCallbacks: Set<RawAudioCallback> = new Set();

export function onRawAudioLevel(callback: RawAudioCallback): () => void {
  rawAudioCallbacks.add(callback);
  return () => rawAudioCallbacks.delete(callback);
}

function notifyRawAudioLevel(rms: number): void {
  rawAudioCallbacks.forEach((cb) => cb(rms));
}

function notifyBreathingAnalysis(analysis: BreathingAnalysis): void {
  breathingCallbacks.forEach((cb) => cb(analysis));
}

export async function startCalibrationTest(): Promise<boolean> {
  if (isAudioRunning) return true;

  calibrationMode = true;
  return startAudioDetection();
}

export function stopCalibrationTest(): void {
  calibrationMode = false;
  stopAudioDetection();
}

let vitalsPollingInterval: ReturnType<typeof setInterval> | null = null;
let useVitalsForDetection = false;
const VITALS_POLL_INTERVAL_MS = 30000;

export function enableVitalsDetection(enabled: boolean): void {
  useVitalsForDetection = enabled;
  if (!enabled) {
    resetVitalsWindow();
  }
}

export async function startVitalsPolling(): Promise<boolean> {
  if (vitalsPollingInterval) return true;

  const status = await getHealthConnectStatus();
  if (!status.available || !status.permissionsGranted) {
    console.log('Health Connect not available or permissions not granted');
    return false;
  }

  enableVitalsDetection(true);

  const poll = async () => {
    try {
      const vitals = await getCurrentVitals();
      if (vitals.heartRate !== null || vitals.hrv !== null) {
        processVitalsUpdate(vitals);
      }
    } catch (error) {
      console.error('Failed to poll vitals:', error);
    }
  };

  await poll();
  vitalsPollingInterval = setInterval(poll, VITALS_POLL_INTERVAL_MS);

  return true;
}

export function stopVitalsPolling(): void {
  if (vitalsPollingInterval) {
    clearInterval(vitalsPollingInterval);
    vitalsPollingInterval = null;
  }
  enableVitalsDetection(false);
}

export function isVitalsPollingActive(): boolean {
  return vitalsPollingInterval !== null;
}

export async function processVitalsUpdate(vitals: VitalsSnapshot): Promise<void> {
  if (!useVitalsForDetection) return;

  addVitalsSample(vitals);

  if (vitals.heartRate !== null) {
    addHRSample(vitals.heartRate);
  }

  if (currentSession?.isActive) {
    const hybrid = await classifyHybrid(lastBreathingAnalysis, vitals);

    if (hybrid.overallConfidence > 0.3) {
      if (hybrid.predictedStage !== currentSession.currentStage) {
        const previousStage = currentSession.currentStage;
        updateSleepStage(hybrid.predictedStage);
        handleStageTransition(previousStage, hybrid.predictedStage, hybrid.remConfidence);
      }
    }
  }
}

export function getDetectionMode(): 'audio' | 'vitals' | 'fused' | 'none' {
  if (isAudioRunning && useVitalsForDetection) return 'fused';
  if (isAudioRunning) return 'audio';
  if (useVitalsForDetection) return 'vitals';
  return 'none';
}

export function getBandpassFilterStatus(): {
  enabled: boolean;
  lowFreq: number;
  highFreq: number;
  centerFreq: number;
  q: number;
} {
  const centerFreq = Math.sqrt(BANDPASS_LOW_FREQ * BANDPASS_HIGH_FREQ);
  return {
    enabled: bandpassFilter !== null,
    lowFreq: BANDPASS_LOW_FREQ,
    highFreq: BANDPASS_HIGH_FREQ,
    centerFreq: Math.round(centerFreq),
    q: BANDPASS_Q,
  };
}

export const sleepService = {
  startSession: startSleepSession,
  endSession: endSleepSession,
  getCurrentSession,
  updateStage: updateSleepStage,
  getCurrentStage,
  isInTargetStage,
  onStageChange: onSleepStageChange,
  onRemStart,
  onRemEnd,
  getHistory: getSleepHistory,
  getStageHistory,
  onStageHistoryChange,
  calculateSummary: calculateSleepSummary,
  getSleepStageDisplayName,
  getSleepStageColor,
  shouldTriggerDream,
  enableVitalsDetection,
  processVitalsUpdate,
  getDetectionMode,
  startVitalsPolling,
  stopVitalsPolling,
  isVitalsPollingActive,
};
