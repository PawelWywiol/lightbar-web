import type { LightColor, LightsAdjust, LightsScheme } from '../lights/lights.types';

export interface UpdateAdjustDeviceEvent {
  name: 'app:update:adjust';
  detail: LightsAdjust;
}

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
    adjust?: LightsAdjust | undefined;
  };
}

export interface UpdateColorDeviceEvent {
  name: 'app:update:color';
  detail: {
    color: LightColor;
  };
}
