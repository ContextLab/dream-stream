import { storage } from '@/lib/storage';
import type { WearableDevice, DeviceType } from '@/types/database';

const STORAGE_KEY_WEARABLE = 'wearable_device';
const STORAGE_KEY_DEVICES = 'wearable_devices';

export interface WearableConnectionState {
  device: WearableDevice | null;
  isConnecting: boolean;
  lastHeartRate: number | null;
  sleepStage: string | null;
}

export interface HealthData {
  heartRate: number | null;
  sleepStage: 'rem' | 'light' | 'deep' | 'awake' | null;
  timestamp: string;
}

async function getLocalDevices(): Promise<WearableDevice[]> {
  const data = await storage.get<WearableDevice[]>(STORAGE_KEY_DEVICES);
  return data || [];
}

async function setLocalDevices(devices: WearableDevice[]): Promise<void> {
  await storage.set(STORAGE_KEY_DEVICES, devices);
}

export async function getConnectedDevice(userId: string): Promise<WearableDevice | null> {
  const devices = await getLocalDevices();
  return devices.find((d) => d.user_id === userId && d.is_connected) || null;
}

export async function getUserDevices(userId: string): Promise<WearableDevice[]> {
  const devices = await getLocalDevices();
  return devices.filter((d) => d.user_id === userId);
}

export async function registerDevice(
  userId: string,
  deviceType: DeviceType,
  deviceName: string | null,
  platformId: string | null
): Promise<WearableDevice> {
  const devices = await getLocalDevices();
  
  devices.forEach((d) => {
    if (d.user_id === userId && d.device_type === deviceType) {
      d.is_connected = false;
    }
  });

  const newDevice: WearableDevice = {
    id: `device-${Date.now()}`,
    user_id: userId,
    device_type: deviceType,
    device_name: deviceName,
    platform_id: platformId,
    is_connected: true,
    last_sync_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  devices.push(newDevice);
  await setLocalDevices(devices);
  await storage.set(STORAGE_KEY_WEARABLE, newDevice);

  return newDevice;
}

export async function connectDevice(deviceId: string): Promise<WearableDevice> {
  const devices = await getLocalDevices();
  const device = devices.find((d) => d.id === deviceId);

  if (!device) {
    throw new Error('Device not found');
  }

  device.is_connected = true;
  device.last_sync_at = new Date().toISOString();

  await setLocalDevices(devices);
  await storage.set(STORAGE_KEY_WEARABLE, device);

  return device;
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  const devices = await getLocalDevices();
  const device = devices.find((d) => d.id === deviceId);

  if (device) {
    device.is_connected = false;
    await setLocalDevices(devices);
  }

  await storage.remove(STORAGE_KEY_WEARABLE);
}

export async function removeDevice(deviceId: string): Promise<void> {
  let devices = await getLocalDevices();
  devices = devices.filter((d) => d.id !== deviceId);
  await setLocalDevices(devices);
  await storage.remove(STORAGE_KEY_WEARABLE);
}

export async function updateLastSync(deviceId: string): Promise<void> {
  const devices = await getLocalDevices();
  const device = devices.find((d) => d.id === deviceId);

  if (device) {
    device.last_sync_at = new Date().toISOString();
    await setLocalDevices(devices);
  }
}

export async function getCachedDevice(): Promise<WearableDevice | null> {
  return storage.get<WearableDevice>(STORAGE_KEY_WEARABLE);
}

export function isHealthKitAvailable(): boolean {
  return false;
}

export function getDeviceTypeName(deviceType: DeviceType): string {
  const names: Record<DeviceType, string> = {
    apple_watch: 'Apple Watch',
    fitbit: 'Fitbit',
    oura: 'Oura Ring',
    garmin: 'Garmin',
    generic: 'Generic Device',
  };
  return names[deviceType] || 'Unknown Device';
}

export function getDeviceTypeIcon(deviceType: DeviceType): string {
  const icons: Record<DeviceType, string> = {
    apple_watch: 'watch-outline',
    fitbit: 'fitness-outline',
    oura: 'ellipse-outline',
    garmin: 'navigate-outline',
    generic: 'bluetooth-outline',
  };
  return icons[deviceType] || 'bluetooth-outline';
}

export const SUPPORTED_DEVICE_TYPES: DeviceType[] = [
  'apple_watch',
  'fitbit',
  'oura',
  'garmin',
  'generic',
];
