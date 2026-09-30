import type { ConnectionResponseData, ConnectionType } from '../connections/connections.types';

export interface DeviceSizeOption {
  value: number;
  label: string;
  grid: {
    rows: number;
    columns: number;
  };
}

export type DeviceSizeOptions = [DeviceSizeOption, ...DeviceSizeOption[]];

export interface Device {
  size: DeviceSizeOption;
}

export type DeviceCustomEventDispatch =
  | {
      name: 'app:device:selected';
      detail: string | undefined;
    }
  | {
      name: 'app:device:updated';
      detail: Device;
    };

export interface ConnectedDevice {
  url: string;
  label?: string | undefined;
  status?: ConnectionType | undefined;
  info?: ConnectionResponseData | undefined;
}
