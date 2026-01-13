import { NativeModules, Platform, StatusBar } from 'react-native';

interface ImmersiveModeInterface {
  enableImmersiveMode(): Promise<boolean>;
  disableImmersiveMode(): Promise<boolean>;
  preventScreenSaver(enable: boolean): Promise<boolean>;
  setScreenBrightness(brightness: number): Promise<boolean>;
}

const { ImmersiveModeModule } = NativeModules as {
  ImmersiveModeModule: ImmersiveModeInterface | undefined;
};

export async function enableImmersiveMode(): Promise<boolean> {
  if (Platform.OS === 'android' && ImmersiveModeModule) {
    try {
      StatusBar.setHidden(true, 'fade');
      return await ImmersiveModeModule.enableImmersiveMode();
    } catch (error) {
      console.error('Failed to enable immersive mode:', error);
      return false;
    }
  }

  if (Platform.OS === 'ios') {
    StatusBar.setHidden(true, 'fade');
    return true;
  }

  return false;
}

export async function disableImmersiveMode(): Promise<boolean> {
  if (Platform.OS === 'android' && ImmersiveModeModule) {
    try {
      StatusBar.setHidden(false, 'fade');
      return await ImmersiveModeModule.disableImmersiveMode();
    } catch (error) {
      console.error('Failed to disable immersive mode:', error);
      return false;
    }
  }

  if (Platform.OS === 'ios') {
    StatusBar.setHidden(false, 'fade');
    return true;
  }

  return false;
}

export async function preventScreenSaver(enable: boolean): Promise<boolean> {
  if (Platform.OS === 'android' && ImmersiveModeModule) {
    try {
      return await ImmersiveModeModule.preventScreenSaver(enable);
    } catch (error) {
      console.error('Failed to set screen saver prevention:', error);
      return false;
    }
  }
  return false;
}

export async function setScreenBrightness(brightness: number): Promise<boolean> {
  if (Platform.OS === 'android' && ImmersiveModeModule) {
    try {
      return await ImmersiveModeModule.setScreenBrightness(brightness);
    } catch (error) {
      console.error('Failed to set screen brightness:', error);
      return false;
    }
  }
  return false;
}

export function isImmersiveModeAvailable(): boolean {
  return Platform.OS === 'android' && ImmersiveModeModule !== undefined;
}
