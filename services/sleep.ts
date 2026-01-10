import Meyda from 'meyda';
import type { MeydaFeaturesObject } from 'meyda';
import type { SleepStage } from '@/types/database';
import { storage } from '@/lib/storage';

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
const RMS_THRESHOLD_BREATHING = 0.02;
const DROWSY_BREATHING_REGULARITY = 0.7;
const SLEEP_BREATHING_REGULARITY = 0.85;

let currentSession: SleepSession | null = null;
let audioContext: AudioContext | null = null;
let analyzer: MeydaAnalyzerInstance | null = null;
let mediaStream: MediaStream | null = null;
let isAudioRunning = false;
const stageCallbacks: Set<SleepStageCallback> = new Set();
let rmsHistory: { value: number; timestamp: number }[] = [];
let peakTimestamps: number[] = [];

function generateId(): string {
  return `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function startSleepSession(source: SleepTrackingSource = 'manual'): Promise<SleepSession> {
  if (currentSession?.isActive) {
    return currentSession;
  }

  const session: SleepSession = {
    id: generateId(),
    startTime: new Date().toISOString(),
    endTime: null,
    currentStage: 'awake',
    source,
    stages: [{
      stage: 'awake',
      startTime: new Date().toISOString(),
      endTime: null,
      durationMinutes: 0,
    }],
    isActive: true,
  };

  currentSession = session;
  await storage.set(STORAGE_KEY_SESSION, session);

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
  
  stageCallbacks.forEach(cb => cb(stage));
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
      case 'rem': remMinutes += duration; break;
      case 'light': lightMinutes += duration; break;
      case 'deep': deepMinutes += duration; break;
      case 'awake': awakeMinutes += duration; break;
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
    remPercentage: totalDurationMinutes > 0 ? Math.round((remMinutes / totalDurationMinutes) * 100) : 0,
    sleepEfficiency: totalDurationMinutes > 0 ? Math.round((sleepMinutes / totalDurationMinutes) * 100) : 0,
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
    console.error('Failed to start audio detection:', error);
    return false;
  }
}

function stopAudioDetection(): void {
  if (analyzer) {
    analyzer.stop();
    analyzer = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  isAudioRunning = false;
  rmsHistory = [];
  peakTimestamps = [];
}

function processAudioFeatures(features: Partial<MeydaFeaturesObject>): void {
  const now = Date.now();
  const rms = features.rms ?? 0;

  rmsHistory.push({ value: rms, timestamp: now });
  rmsHistory = rmsHistory.filter(entry => now - entry.timestamp < ANALYSIS_WINDOW_MS);

  if (rms > RMS_THRESHOLD_BREATHING) {
    const lastPeak = peakTimestamps[peakTimestamps.length - 1];
    if (!lastPeak || now - lastPeak > 1500) {
      peakTimestamps.push(now);
    }
  }

  peakTimestamps = peakTimestamps.filter(ts => now - ts < ANALYSIS_WINDOW_MS);

  if (rmsHistory.length > 20) {
    const analysis = analyzeBreathing();
    const stage = inferSleepStage(analysis);
    
    if (currentSession && stage !== currentSession.currentStage) {
      updateSleepStage(stage);
    }
  }
}

function analyzeBreathing(): BreathingAnalysis {
  if (peakTimestamps.length < 3) {
    return {
      isBreathingDetected: false,
      breathsPerMinute: 0,
      regularity: 0,
      amplitude: 0,
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < peakTimestamps.length; i++) {
    intervals.push(peakTimestamps[i] - peakTimestamps[i - 1]);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const breathsPerMinute = 60000 / avgInterval;

  const variance = intervals.reduce(
    (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
    0
  ) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const regularity = Math.max(0, 1 - stdDev / avgInterval);

  const recentRms = rmsHistory.slice(-20);
  const amplitude = Math.max(...recentRms.map(r => r.value));

  const isBreathingDetected =
    breathsPerMinute >= BREATHING_RATE_MIN &&
    breathsPerMinute <= BREATHING_RATE_MAX &&
    regularity > 0.3;

  return {
    isBreathingDetected,
    breathsPerMinute: isBreathingDetected ? breathsPerMinute : 0,
    regularity,
    amplitude,
  };
}

function inferSleepStage(analysis: BreathingAnalysis): SleepStage {
  if (!analysis.isBreathingDetected) {
    return 'awake';
  }
  
  if (analysis.regularity < DROWSY_BREATHING_REGULARITY) {
    return 'awake';
  }
  
  if (analysis.regularity < SLEEP_BREATHING_REGULARITY) {
    return 'light';
  }
  
  if (analysis.breathsPerMinute < 12) {
    return 'deep';
  }
  
  if (analysis.breathsPerMinute > 18) {
    return 'rem';
  }
  
  return 'light';
}

export function shouldTriggerDream(stage: SleepStage): boolean {
  return stage === 'light' || stage === 'rem';
}

export const sleepService = {
  startSession: startSleepSession,
  endSession: endSleepSession,
  getCurrentSession,
  updateStage: updateSleepStage,
  getCurrentStage,
  isInTargetStage,
  onStageChange: onSleepStageChange,
  getHistory: getSleepHistory,
  calculateSummary: calculateSleepSummary,
  getSleepStageDisplayName,
  getSleepStageColor,
  shouldTriggerDream,
};
