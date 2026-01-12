import { Platform, NativeModules } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const WAKE_LOCK_TAG = 'DreamStreamSleepMode';

let isActive = false;

export async function activateScreenWakeLock(): Promise<void> {
  if (isActive) return;

  try {
    await activateKeepAwakeAsync(WAKE_LOCK_TAG);

    if (Platform.OS === 'android' && NativeModules.UIManager?.getViewManagerConfig) {
      try {
        const { UIManager } = NativeModules;
        if (UIManager.setLayoutAnimationEnabledExperimental) {
          UIManager.setLayoutAnimationEnabledExperimental(true);
        }
      } catch {}
    }

    isActive = true;
  } catch (error) {
    console.warn('Failed to activate screen wake lock:', error);
  }
}

export async function deactivateScreenWakeLock(): Promise<void> {
  if (!isActive) return;

  try {
    await deactivateKeepAwake(WAKE_LOCK_TAG);
    isActive = false;
  } catch (error) {
    console.warn('Failed to deactivate screen wake lock:', error);
  }
}

export function isScreenWakeLockActive(): boolean {
  return isActive;
}
