import { supabase } from './supabase';
import { storage } from '@/lib/storage';
import type { WearableDevice, DeviceType } from '@/types/database';

const STORAGE_KEY_WEARABLE = 'wearable_device';

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

/**
 * Get the currently connected wearable device for a user
 */
export async function getConnectedDevice(userId: string): Promise<WearableDevice | null> {
  try {
    const { data, error } = await supabase
      .from('wearable_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as WearableDevice;
  } catch {
    return null;
  }
}

/**
 * Get all wearable devices for a user
 */
export async function getUserDevices(userId: string): Promise<WearableDevice[]> {
  try {
    const { data, error } = await supabase
      .from('wearable_devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching wearable devices:', error.message);
      return [];
    }

    return (data || []) as WearableDevice[];
  } catch {
    return [];
  }
}

/**
 * Register a new wearable device
 */
export async function registerDevice(
  userId: string,
  deviceType: DeviceType,
  deviceName: string | null,
  platformId: string | null
): Promise<WearableDevice> {
  // First disconnect any existing devices of the same type
  await supabase
    .from('wearable_devices')
    .update({ is_connected: false })
    .eq('user_id', userId)
    .eq('device_type', deviceType);

  const { data, error } = await supabase
    .from('wearable_devices')
    .insert({
      user_id: userId,
      device_type: deviceType,
      device_name: deviceName,
      platform_id: platformId,
      is_connected: true,
      last_sync_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register device: ${error.message}`);
  }

  // Cache the device locally
  await storage.set(STORAGE_KEY_WEARABLE, data);

  return data as WearableDevice;
}

/**
 * Connect to an existing wearable device
 */
export async function connectDevice(deviceId: string): Promise<WearableDevice> {
  const { data, error } = await supabase
    .from('wearable_devices')
    .update({
      is_connected: true,
      last_sync_at: new Date().toISOString(),
    })
    .eq('id', deviceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to connect device: ${error.message}`);
  }

  await storage.set(STORAGE_KEY_WEARABLE, data);

  return data as WearableDevice;
}

/**
 * Disconnect a wearable device
 */
export async function disconnectDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('wearable_devices')
    .update({ is_connected: false })
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to disconnect device: ${error.message}`);
  }

  await storage.remove(STORAGE_KEY_WEARABLE);
}

/**
 * Remove a wearable device completely
 */
export async function removeDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('wearable_devices')
    .delete()
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to remove device: ${error.message}`);
  }

  await storage.remove(STORAGE_KEY_WEARABLE);
}

/**
 * Update the last sync timestamp for a device
 */
export async function updateLastSync(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('wearable_devices')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', deviceId);

  if (error) {
    console.warn('Failed to update last sync:', error.message);
  }
}

/**
 * Get cached device from local storage (for offline access)
 */
export async function getCachedDevice(): Promise<WearableDevice | null> {
  return storage.get<WearableDevice>(STORAGE_KEY_WEARABLE);
}

/**
 * Check if HealthKit/Health Connect is available on this platform
 * This is a stub that would integrate with expo-health in production
 */
export function isHealthKitAvailable(): boolean {
  // In production, this would check Platform.OS and availability
  // For now, return false as health integration requires native setup
  return false;
}

/**
 * Get display name for device type
 */
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

/**
 * Get icon name for device type (Ionicons)
 */
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

/**
 * Supported device types for pairing
 */
export const SUPPORTED_DEVICE_TYPES: DeviceType[] = [
  'apple_watch',
  'fitbit',
  'oura',
  'garmin',
  'generic',
];
