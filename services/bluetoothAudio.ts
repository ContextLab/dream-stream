import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

interface BluetoothDevice {
  name: string;
  address: string;
}

interface AudioInputSource {
  isBluetoothScoOn: boolean;
  isSpeakerphoneOn: boolean;
  isWiredHeadsetOn: boolean;
  mode: number;
}

type ScoState = 'connected' | 'disconnected' | 'connecting' | 'unknown';

interface BluetoothAudioModuleInterface {
  isBluetoothAvailable(): Promise<boolean>;
  isBluetoothHeadsetConnected(): Promise<boolean>;
  getConnectedBluetoothDevice(): Promise<BluetoothDevice | null>;
  startBluetoothSco(): Promise<boolean>;
  stopBluetoothSco(): Promise<boolean>;
  isScoConnected(): Promise<boolean>;
  getAudioInputSource(): Promise<AudioInputSource>;
}

const { BluetoothAudioModule } = NativeModules as {
  BluetoothAudioModule: BluetoothAudioModuleInterface | undefined;
};

let eventEmitter: NativeEventEmitter | null = null;

function getEventEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== 'android' || !BluetoothAudioModule) {
    return null;
  }
  if (!eventEmitter) {
    eventEmitter = new NativeEventEmitter(NativeModules.BluetoothAudioModule);
  }
  return eventEmitter;
}

export function isBluetoothAudioSupported(): boolean {
  return Platform.OS === 'android' && BluetoothAudioModule !== undefined;
}

export async function isBluetoothAvailable(): Promise<boolean> {
  if (!isBluetoothAudioSupported()) {
    return false;
  }
  try {
    return await BluetoothAudioModule!.isBluetoothAvailable();
  } catch (error) {
    console.warn('Failed to check Bluetooth availability:', error);
    return false;
  }
}

export async function isBluetoothHeadsetConnected(): Promise<boolean> {
  if (!isBluetoothAudioSupported()) {
    return false;
  }
  try {
    return await BluetoothAudioModule!.isBluetoothHeadsetConnected();
  } catch (error) {
    console.warn('Failed to check Bluetooth headset connection:', error);
    return false;
  }
}

export async function getConnectedBluetoothDevice(): Promise<BluetoothDevice | null> {
  if (!isBluetoothAudioSupported()) {
    return null;
  }
  try {
    return await BluetoothAudioModule!.getConnectedBluetoothDevice();
  } catch (error) {
    console.warn('Failed to get connected Bluetooth device:', error);
    return null;
  }
}

export async function startBluetoothSco(): Promise<boolean> {
  if (!isBluetoothAudioSupported()) {
    return false;
  }
  try {
    return await BluetoothAudioModule!.startBluetoothSco();
  } catch (error) {
    console.warn('Failed to start Bluetooth SCO:', error);
    return false;
  }
}

export async function stopBluetoothSco(): Promise<boolean> {
  if (!isBluetoothAudioSupported()) {
    return false;
  }
  try {
    return await BluetoothAudioModule!.stopBluetoothSco();
  } catch (error) {
    console.warn('Failed to stop Bluetooth SCO:', error);
    return false;
  }
}

export async function isScoConnected(): Promise<boolean> {
  if (!isBluetoothAudioSupported()) {
    return false;
  }
  try {
    return await BluetoothAudioModule!.isScoConnected();
  } catch (error) {
    console.warn('Failed to check SCO connection:', error);
    return false;
  }
}

export async function getAudioInputSource(): Promise<AudioInputSource | null> {
  if (!isBluetoothAudioSupported()) {
    return null;
  }
  try {
    return await BluetoothAudioModule!.getAudioInputSource();
  } catch (error) {
    console.warn('Failed to get audio input source:', error);
    return null;
  }
}

export function onScoStateChange(callback: (state: ScoState) => void): () => void {
  const emitter = getEventEmitter();
  if (!emitter) {
    return () => {};
  }

  const subscription = emitter.addListener(
    'BluetoothScoStateChange',
    (event: { state: ScoState }) => {
      callback(event.state);
    }
  );

  return () => subscription.remove();
}

export async function enableBluetoothAudioInput(): Promise<boolean> {
  const isConnected = await isBluetoothHeadsetConnected();
  if (!isConnected) {
    return false;
  }

  return await startBluetoothSco();
}

export async function disableBluetoothAudioInput(): Promise<boolean> {
  return await stopBluetoothSco();
}

export type { BluetoothDevice, AudioInputSource, ScoState };
