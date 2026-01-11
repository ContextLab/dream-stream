import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { storage } from '@/lib/storage';

export interface VolumeCheckResult {
  currentVolume: number;
  expectedVolume: number;
  isMatching: boolean;
  requiresAdjustment: boolean;
}

const VOLUME_TOLERANCE = 0.05;

export async function getCalibratedVolume(): Promise<number> {
  const prefs = await storage.getPreferences();
  return prefs.voiceVolume;
}

export async function setCalibratedVolume(volume: number): Promise<void> {
  await storage.setPreferences({ voiceVolume: volume });
}

export async function verifyVolume(expectedVolume: number): Promise<VolumeCheckResult> {
  const currentVolume = await getCalibratedVolume();
  const isMatching = Math.abs(currentVolume - expectedVolume) <= VOLUME_TOLERANCE;

  return {
    currentVolume,
    expectedVolume,
    isMatching,
    requiresAdjustment: !isMatching,
  };
}

export async function fadeVolume(
  sound: Audio.Sound,
  fromVolume: number,
  toVolume: number,
  durationMs: number
): Promise<void> {
  const steps = 20;
  const stepDuration = durationMs / steps;
  const volumeStep = (toVolume - fromVolume) / steps;

  for (let i = 0; i <= steps; i++) {
    const currentVolume = fromVolume + volumeStep * i;
    try {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, currentVolume)));
    } catch {
      break;
    }
    if (i < steps) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }
  }
}

export async function fadeIn(
  sound: Audio.Sound,
  targetVolume: number,
  durationMs: number = 2000
): Promise<void> {
  return fadeVolume(sound, 0, targetVolume, durationMs);
}

export async function fadeOut(
  sound: Audio.Sound,
  currentVolume: number,
  durationMs: number = 5000
): Promise<void> {
  return fadeVolume(sound, currentVolume, 0, durationMs);
}

export function getVolumeWarningThreshold(): number {
  return 0.7;
}

export function isVolumeSafe(volume: number): boolean {
  return volume <= getVolumeWarningThreshold();
}

export function getVolumeWarningMessage(volume: number): string | null {
  if (volume > 0.9) {
    return 'Volume is very high. This may be uncomfortable during sleep.';
  }
  if (volume > getVolumeWarningThreshold()) {
    return 'Volume is above recommended level for sleep.';
  }
  return null;
}

const INTERRUPTION_MODE_DO_NOT_MIX = 1;

export async function configureAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: INTERRUPTION_MODE_DO_NOT_MIX,
    interruptionModeAndroid: INTERRUPTION_MODE_DO_NOT_MIX,
  });
}

export async function configureSleepAudioSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: INTERRUPTION_MODE_DO_NOT_MIX,
    interruptionModeAndroid: INTERRUPTION_MODE_DO_NOT_MIX,
    allowsRecordingIOS: false,
  });
}

export function getPlatformVolumeCapabilities(): {
  canReadSystemVolume: boolean;
  canSetSystemVolume: boolean;
  supportsVolumeButtons: boolean;
} {
  return {
    canReadSystemVolume: false,
    canSetSystemVolume: false,
    supportsVolumeButtons: Platform.OS !== 'web',
  };
}
