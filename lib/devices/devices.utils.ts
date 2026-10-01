import type { ConnectionRequestData } from '../connections/connections.types';
import { DEFAULT_LIGHTS_FRAME_TEMPO, LIGHTS_BACKGROUND_COLOR } from '../lights/lights.config';
import { type LightColor, type LightsFrame, type LightsScheme, lightsFrameType } from '../lights/lights.types';
import { getStorageData, removeStorageData, setStorageData } from '../utils/storage/storage';
import { CONNECTED_DEVICES_STORAGE_KEY } from './devices.config';
import type { ConnectedDevice } from './devices.types';
import { ConnectedDevicesValidationSchema, ConnectedDeviceUrlValidationSchema } from './devicesSchema';

export const loadConnectedDevices = (): ConnectedDevice[] => {
  const devices: ConnectedDevice[] = getStorageData(
    CONNECTED_DEVICES_STORAGE_KEY('devices'),
    ConnectedDevicesValidationSchema,
    [] as ConnectedDevice[],
  );

  return devices;
};

export const saveConnectedDevices = (devices: ConnectedDevice[]) => {
  setStorageData(
    CONNECTED_DEVICES_STORAGE_KEY('devices'),
    devices.map(({ url, label }) => ({ url, label })),
  );
};

export const loadLastSelectedDeviceUrl = (): string | undefined =>
  getStorageData(CONNECTED_DEVICES_STORAGE_KEY('selected'), ConnectedDeviceUrlValidationSchema, undefined);

export const saveLastSelectedDeviceUrl = (url?: string) => {
  if (url && ConnectedDeviceUrlValidationSchema.safeParse(url).success) {
    setStorageData(CONNECTED_DEVICES_STORAGE_KEY('selected'), url);
  } else {
    removeStorageData(CONNECTED_DEVICES_STORAGE_KEY('selected'));
  }
};

export const updateConnectedDevicesList = (devices: ConnectedDevice[], device: ConnectedDevice) => {
  let deviceExists = false;

  const updatedDevices = devices.map((d) => {
    if (d.url === device.url) {
      deviceExists = true;
      return { ...d, ...device };
    }

    return d;
  });

  if (!deviceExists) {
    updatedDevices.push(device);
  }

  return updatedDevices;
};

export const progressPercentage = (index: number, current: number, max: number) =>
  Math.ceil((100 * (current + index + 1)) / (max || 1));

const resolveFrameColorIndexes = (frame: LightsFrame, size: number): LightsFrame => ({
  ...frame,
  colors: [
    ...frame.colors,
    ...(Array.from({ length: size - frame.colors.length }).fill(LIGHTS_BACKGROUND_COLOR) as LightColor[]),
  ].slice(0, size),
});

export const resolveLightsSchemeColorIndexes = (scheme: LightsScheme, size: number): LightsScheme => ({
  ...scheme,
  frames: scheme.frames.map((frame) => resolveFrameColorIndexes(frame, size)),
});

export const convertColorToConnectionRequestData = (color: LightColor): ConnectionRequestData => ({
  type: 'frame',
  data: {
    type: lightsFrameType.step,
    tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
    colors: [color],
  },
});

export const convertLightsFrameToConnectionRequestData = (frame: LightsFrame): ConnectionRequestData => ({
  type: 'frame',
  data: frame,
});
