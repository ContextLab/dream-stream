import { Platform } from 'react-native';
import Meyda from 'meyda';
import type { MeydaFeaturesObject } from 'meyda';
import type { SleepStage } from '@/types/database';
import { storage } from '@/lib/storage';
import {
  addVitalsSample,
  analyzeVitals,
  getCurrentVitalsStage,
  resetVitalsWindow,
} from './vitalsClassifier';
import { getCurrentVitals, getHealthConnectStatus, type VitalsSnapshot } from './healthConnect';
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

let currentSession: SleepSession | null = null;
let audioContext: AudioContext | null = null;
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

function generateId(): string {
  return `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function startSleepSession(
  source: SleepTrackingSource = 'manual'
): Promise<SleepSession> {
  if (currentSession?.isActive) {
    return currentSession;
  }

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

  if (source === 'audio') {
    await startAudioDetection();
  }

  return session;
}

export async function endSleepSession(): Promise<SleepSession | null> {
  if (!currentSession) return null;

  stopAudioDetection();

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

    analyzer = Meyda.createMeydaAnalyzer({
      audioContext,
      source,
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
  if (isNativeAudioAvailable()) {
    stopNativeAudioCapture();
  }

  if (analyzer) {
    analyzer.stop();
    analyzer = null;
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

function processRmsValue(rms: number): void {
  const now = Date.now();

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

    notifyBreathingAnalysis(analysis);

    if (!calibrationMode && currentSession && currentSession.currentStage) {
      const stage = inferSleepStage(analysis);
      if (stage !== currentSession.currentStage) {
        const previousStage = currentSession.currentStage;
        updateSleepStage(stage);
        handleStageTransition(previousStage, stage);
      }
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

  let spikeCount = 0;
  const avgRms = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;

  for (const rms of rmsValues) {
    if (rms > avgRms * 3) {
      spikeCount++;
    }
  }

  return spikeCount / rmsValues.length;
}

function analyzeBreathing(): BreathingAnalysis {
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

  const partialAnalysis = {
    isBreathingDetected,
    breathsPerMinute: isBreathingDetected ? breathsPerMinute : 0,
    regularity,
    amplitude,
    respiratoryRateVariability: rrv,
    movementIntensity,
    confidenceScore,
    estimatedStage: 'awake' as SleepStage,
  };

  partialAnalysis.estimatedStage = inferSleepStage(partialAnalysis);

  return partialAnalysis;
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

function handleStageTransition(previousStage: SleepStage, newStage: SleepStage): void {
  const now = Date.now();
  stageHistory.push({ stage: newStage, timestamp: now });
  stageHistory = stageHistory.filter((s) => now - s.timestamp < 3600000);

  notifyStageHistoryChange();

  if (newStage === 'rem' && previousStage !== 'rem') {
    remCallbacks.forEach((cb) => cb());
  }

  if (previousStage === 'rem' && newStage !== 'rem') {
    remEndCallbacks.forEach((cb) => cb());
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

export function processVitalsUpdate(vitals: VitalsSnapshot): void {
  if (!useVitalsForDetection) return;

  addVitalsSample(vitals);

  if (currentSession?.isActive) {
    const vitalsAnalysis = analyzeVitals();

    if (vitalsAnalysis.confidence > 0.5) {
      const fusedStage = fuseDetectionSources(vitalsAnalysis.estimatedStage);
      if (fusedStage !== currentSession.currentStage) {
        const previousStage = currentSession.currentStage;
        updateSleepStage(fusedStage);
        handleStageTransition(previousStage, fusedStage);
      }
    }
  }
}

function fuseDetectionSources(vitalsStage: SleepStage): SleepStage {
  if (!isAudioRunning) {
    return vitalsStage;
  }

  const audioStage = currentSession?.currentStage ?? 'awake';

  if (vitalsStage === audioStage) {
    return vitalsStage;
  }

  if (vitalsStage === 'rem' || audioStage === 'rem') {
    return 'rem';
  }

  if (vitalsStage === 'deep' && audioStage !== 'awake') {
    return 'deep';
  }

  if (audioStage === 'deep' && vitalsStage !== 'awake') {
    return 'deep';
  }

  if (vitalsStage === 'awake' || audioStage === 'awake') {
    return 'awake';
  }

  return vitalsStage;
}

export function getDetectionMode(): 'audio' | 'vitals' | 'fused' | 'none' {
  if (isAudioRunning && useVitalsForDetection) return 'fused';
  if (isAudioRunning) return 'audio';
  if (useVitalsForDetection) return 'vitals';
  return 'none';
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
