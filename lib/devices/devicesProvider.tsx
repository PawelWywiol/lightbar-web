import * as Sentry from '@sentry/react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dispatchCustomEvent } from '../utils/customEvent/customEvent';
import { ConnectedDeviceResolver } from './connectedDeviceResolver';
import type { ConnectedDevice, DeviceCustomEventDispatch } from './devices.types';
import {
  loadConnectedDevices,
  loadLastSelectedDeviceUrl,
  saveConnectedDevices,
  saveLastSelectedDeviceUrl,
  updateConnectedDevicesList,
} from './devices.utils';
import { findLocalNetworkConnectedDevices } from './devicesScan';

const CONNECTED_DEVICES_MAX_COUNT = 255;

interface ConnectedDevicesContextProps {
  devices: ConnectedDevice[];
  updateDevice: (device: ConnectedDevice) => void;
  removeDevice: (device: string) => void;
  findDevices: () => void;
  scanProgress: number;
  selectedDevice?: ConnectedDevice | undefined;
  selectDevice: (url: string) => void;
}

export const ConnectedDevicesContext = createContext<ConnectedDevicesContextProps>({
  devices: [],
  updateDevice: () => {
    // void
  },
  removeDevice: () => {
    // void
  },
  findDevices: () => {
    // void
  },
  scanProgress: 100,
  selectedDevice: undefined,
  selectDevice: () => {
    // void
  },
});

export const useConnectedDevices = () => useContext(ConnectedDevicesContext);

export const ConnectedDevicesProvider = ({ children }: { children: ReactNode }) => {
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [scanProgress, setScanProgress] = useState(100);
  const [selectedDevice, setSelectedDevice] = useState<ConnectedDevice | undefined>();

  const updateDevice = useCallback((device: ConnectedDevice) => {
    setDevices((previousDevices) => {
      const updatedDevices = updateConnectedDevicesList(previousDevices, device);

      saveConnectedDevices(updatedDevices);

      return updatedDevices.slice(-1 * CONNECTED_DEVICES_MAX_COUNT);
    });
  }, []);

  const removeDevice = useCallback((url: string) => {
    setDevices((previousDevices) => {
      const updatedDevices = previousDevices.filter((device) => device.url !== url);

      saveConnectedDevices(updatedDevices);

      return updatedDevices;
    });
  }, []);

  const findDevices = useCallback(() => {
    void findLocalNetworkConnectedDevices(setScanProgress)
      .then((urls) => {
        for (const url of urls) {
          updateDevice({ url });
        }
      })
      .catch((error) => {
        Sentry.captureException(error, { tags: { feature: 'device-scan' } });
        setScanProgress(100);
      });
  }, [updateDevice]);

  const selectDevice = useCallback(
    (url: string) => {
      const newSelectedDevice = devices.find((device) => device.url === url);
      setSelectedDevice(newSelectedDevice);
      saveLastSelectedDeviceUrl(newSelectedDevice?.url);

      dispatchCustomEvent<DeviceCustomEventDispatch>({
        name: 'app:device:selected',
        detail: newSelectedDevice?.url,
      });
    },
    [devices],
  );

  useEffect(() => {
    const loadedDevices = loadConnectedDevices();
    const lastSelectedDeviceUrl = loadLastSelectedDeviceUrl();
    const lastSelectedDevice = loadedDevices.find((device) => device.url === lastSelectedDeviceUrl);

    setDevices(loadedDevices);
    setSelectedDevice(lastSelectedDevice);
  }, []);

  const firstDeviceUrl = devices[0]?.url;

  useEffect(() => {
    if (!selectedDevice?.url && firstDeviceUrl) {
      const firstDevice = devices.find((device) => device.url === firstDeviceUrl);
      setSelectedDevice(firstDevice);
    }
  }, [selectedDevice?.url, firstDeviceUrl, devices]);

  const connectedDevicesProviderValue = useMemo(
    () => ({
      devices,
      updateDevice,
      removeDevice,
      findDevices,
      scanProgress,
      selectedDevice,
      selectDevice,
    }),
    [devices, updateDevice, removeDevice, findDevices, scanProgress, selectedDevice, selectDevice],
  );

  return (
    <>
      {devices.map((device) => (
        <ConnectedDeviceResolver
          key={device.url}
          device={device}
          onChange={updateDevice}
          selected={selectedDevice?.url === device.url}
        />
      ))}
      <ConnectedDevicesContext.Provider value={connectedDevicesProviderValue}>
        {children}
      </ConnectedDevicesContext.Provider>
    </>
  );
};
