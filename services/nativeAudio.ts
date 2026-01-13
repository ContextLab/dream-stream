import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { Audio } from 'expo-av';
import {
  isBluetoothHeadsetConnected,
  startBluetoothSco,
  stopBluetoothSco,
  getConnectedBluetoothDevice,
  isBluetoothAudioSupported,
  isScoConnected,
} from './bluetoothAudio';

interface NativeAudioRecorderInterface {
  startRecording(useBluetoothSco: boolean): Promise<boolean>;
  stopRecording(): Promise<boolean>;
  isRecording(): Promise<boolean>;
}

const { NativeAudioRecorderModule } = NativeModules as {
  NativeAudioRecorderModule: NativeAudioRecorderInterface | undefined;
};

type AudioCallback = (rms: number) => void;
type AudioSource = 'phone' | 'bluetooth' | 'wired';

let recording: Audio.Recording | null = null;
let isRunning = false;
let audioCallback: AudioCallback | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;
let isBluetoothScoActive = false;
let currentAudioSource: AudioSource = 'phone';
let nativeEventSubscription: { remove: () => void } | null = null;

const POLLING_INTERVAL_MS = 100;
const DBFS_MIN = -60;
const DBFS_MAX = 0;

function dbfsToRms(dbfs: number): number {
  const clamped = Math.max(DBFS_MIN, Math.min(DBFS_MAX, dbfs));
  return (clamped - DBFS_MIN) / (DBFS_MAX - DBFS_MIN);
}

function isNativeRecorderAvailable(): boolean {
  return Platform.OS === 'android' && NativeAudioRecorderModule !== undefined;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request microphone permission:', error);
    return false;
  }
}

export async function hasMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check microphone permission:', error);
    return false;
  }
}

async function startNativeRecorderCapture(callback: AudioCallback): Promise<boolean> {
  if (!NativeAudioRecorderModule) {
    return false;
  }

  try {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      console.error('Microphone permission not granted');
      return false;
    }

    let useBluetoothSco = false;

    if (isBluetoothAudioSupported()) {
      const btConnected = await isBluetoothHeadsetConnected();
      if (btConnected) {
        const device = await getConnectedBluetoothDevice();
        console.log('Bluetooth headset connected:', device?.name ?? 'Unknown');

        const scoStarted = await startBluetoothSco();
        if (scoStarted) {
          isBluetoothScoActive = true;
          currentAudioSource = 'bluetooth';
          useBluetoothSco = true;
          console.log('Bluetooth SCO ready - using native recorder with BT mic');
        } else {
          console.log('Failed to start Bluetooth SCO - using phone mic');
          currentAudioSource = 'phone';
        }
      } else {
        currentAudioSource = 'phone';
        console.log('No Bluetooth headset - using phone microphone');
      }
    }

    const eventEmitter = new NativeEventEmitter(NativeModules.NativeAudioRecorderModule);
    nativeEventSubscription = eventEmitter.addListener(
      'NativeAudioLevel',
      (event: { rms: number; dbfs: number }) => {
        callback(event.rms);
      }
    );

    const success = await NativeAudioRecorderModule.startRecording(useBluetoothSco);
    if (success) {
      audioCallback = callback;
      isRunning = true;
      return true;
    } else {
      nativeEventSubscription?.remove();
      nativeEventSubscription = null;
      return false;
    }
  } catch (error) {
    console.error('Failed to start native recorder:', error);
    nativeEventSubscription?.remove();
    nativeEventSubscription = null;
    return false;
  }
}

async function startExpoAvCapture(callback: AudioCallback): Promise<boolean> {
  try {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      console.error('Microphone permission not granted');
      return false;
    }

    if (Platform.OS === 'android' && isBluetoothAudioSupported()) {
      const btConnected = await isBluetoothHeadsetConnected();
      if (btConnected) {
        const device = await getConnectedBluetoothDevice();
        console.log('Bluetooth headset connected:', device?.name ?? 'Unknown');

        const scoStarted = await startBluetoothSco();
        if (scoStarted) {
          isBluetoothScoActive = true;
          currentAudioSource = 'bluetooth';
          console.log('Bluetooth SCO started - waiting for connection...');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          console.log('Bluetooth SCO ready (expo-av may not use it)');
        } else {
          console.log('Failed to start Bluetooth SCO');
          currentAudioSource = 'phone';
        }
      } else {
        currentAudioSource = 'phone';
      }
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const recordingOptions: Audio.RecordingOptions = {
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.LOW,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 64000,
      },
    };

    const { recording: newRecording } = await Audio.Recording.createAsync(
      recordingOptions,
      undefined,
      undefined
    );

    recording = newRecording;
    audioCallback = callback;
    isRunning = true;

    statusInterval = setInterval(async () => {
      if (!recording || !isRunning) return;

      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          const rms = dbfsToRms(status.metering);
          audioCallback?.(rms);
        }
      } catch (_) {}
    }, POLLING_INTERVAL_MS);

    return true;
  } catch (error) {
    console.error('Failed to start expo-av capture:', error);
    return false;
  }
}

export async function startNativeAudioCapture(callback: AudioCallback): Promise<boolean> {
  if (isRunning) {
    return true;
  }

  if (Platform.OS === 'web') {
    console.warn('startNativeAudioCapture should not be called on web platform');
    return false;
  }

  if (isNativeRecorderAvailable()) {
    const success = await startNativeRecorderCapture(callback);
    if (success) {
      return true;
    }
    console.log('Native recorder failed, falling back to expo-av');
  }

  return startExpoAvCapture(callback);
}

export async function stopNativeAudioCapture(): Promise<void> {
  isRunning = false;
  audioCallback = null;

  if (nativeEventSubscription) {
    nativeEventSubscription.remove();
    nativeEventSubscription = null;
  }

  if (NativeAudioRecorderModule) {
    try {
      await NativeAudioRecorderModule.stopRecording();
    } catch (_) {}
  }

  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }

  if (recording) {
    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }
    } catch (_) {}
    recording = null;
  }

  if (isBluetoothScoActive) {
    try {
      await stopBluetoothSco();
      isBluetoothScoActive = false;
      console.log('Bluetooth SCO stopped');
    } catch (_) {}
  }

  currentAudioSource = 'phone';

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  } catch (_) {}
}

export function isNativeAudioRunning(): boolean {
  return isRunning;
}

export function isNativeAudioAvailable(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function getCurrentAudioSource(): AudioSource {
  return currentAudioSource;
}

export function isUsingBluetoothMicrophone(): boolean {
  return isBluetoothScoActive;
}

export async function checkBluetoothAvailability(): Promise<{
  supported: boolean;
  headsetConnected: boolean;
  deviceName: string | null;
}> {
  if (!isBluetoothAudioSupported()) {
    return { supported: false, headsetConnected: false, deviceName: null };
  }

  const connected = await isBluetoothHeadsetConnected();
  let deviceName: string | null = null;

  if (connected) {
    const device = await getConnectedBluetoothDevice();
    deviceName = device?.name ?? null;
  }

  return { supported: true, headsetConnected: connected, deviceName };
}

export type { AudioSource };
