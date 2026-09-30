import type { LightColor, LightsScheme } from '../lights/lights.types';

export interface UpdateSchemeDeviceEvent {
  name: 'app:update:scheme';
  detail: {
    scheme: LightsScheme;
    frameIndex: number;
  };
}

export interface SaveSchemeDeviceEvent {
  name: 'app:save:scheme';
  detail: {
    uid: string;
    scheme: LightsScheme;
  };
}

export interface UpdateColorDeviceEvent {
  name: 'app:update:color';
  detail: {
    color: LightColor;
  };
}
