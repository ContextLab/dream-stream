import { useState, useEffect, useCallback } from 'react';
import {
  getConnectedDevice,
  getUserDevices,
  registerDevice,
  connectDevice,
  disconnectDevice,
  removeDevice,
  getCachedDevice,
  SUPPORTED_DEVICE_TYPES,
} from '@/services/wearable';
import { useAuth } from './useAuth';
import type { WearableDevice, DeviceType } from '@/types/database';

interface UseWearableReturn {
  connectedDevice: WearableDevice | null;
  allDevices: WearableDevice[];
  isLoading: boolean;
  isConnecting: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  register: (deviceType: DeviceType, deviceName?: string) => Promise<WearableDevice>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  remove: (deviceId: string) => Promise<void>;
  supportedTypes: DeviceType[];
}

export function useWearable(): UseWearableReturn {
  const { user } = useAuth();
  const [connectedDevice, setConnectedDevice] = useState<WearableDevice | null>(null);
  const [allDevices, setAllDevices] = useState<WearableDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!user) {
      setConnectedDevice(null);
      setAllDevices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const cached = await getCachedDevice();
      if (cached) {
        setConnectedDevice(cached);
      }

      const [connected, devices] = await Promise.all([
        getConnectedDevice(user.id),
        getUserDevices(user.id),
      ]);

      setConnectedDevice(connected);
      setAllDevices(devices);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load devices'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleRegister = useCallback(
    async (deviceType: DeviceType, deviceName?: string): Promise<WearableDevice> => {
      if (!user) {
        throw new Error('Must be logged in to register a device');
      }

      setIsConnecting(true);
      setError(null);

      try {
        const device = await registerDevice(user.id, deviceType, deviceName || null, null);
        setConnectedDevice(device);
        await fetchDevices();
        return device;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to register device');
        setError(error);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [user, fetchDevices]
  );

  const handleConnect = useCallback(
    async (deviceId: string): Promise<void> => {
      setIsConnecting(true);
      setError(null);

      try {
        const device = await connectDevice(deviceId);
        setConnectedDevice(device);
        await fetchDevices();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to connect device');
        setError(error);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    [fetchDevices]
  );

  const handleDisconnect = useCallback(async (): Promise<void> => {
    if (!connectedDevice) return;

    try {
      await disconnectDevice(connectedDevice.id);
      setConnectedDevice(null);
      await fetchDevices();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to disconnect device'));
      throw err;
    }
  }, [connectedDevice, fetchDevices]);

  const handleRemove = useCallback(
    async (deviceId: string): Promise<void> => {
      try {
        await removeDevice(deviceId);
        if (connectedDevice?.id === deviceId) {
          setConnectedDevice(null);
        }
        await fetchDevices();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to remove device'));
        throw err;
      }
    },
    [connectedDevice, fetchDevices]
  );

  return {
    connectedDevice,
    allDevices,
    isLoading,
    isConnecting,
    error,
    refresh: fetchDevices,
    register: handleRegister,
    connect: handleConnect,
    disconnect: handleDisconnect,
    remove: handleRemove,
    supportedTypes: SUPPORTED_DEVICE_TYPES,
  };
}
