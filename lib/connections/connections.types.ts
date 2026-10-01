import type { LightsFrame } from '../lights/lights.types';

export type ConnectionType = 'CLOSED' | 'CONNECTING' | 'CONNECTED' | 'PROCESSING';
enum NetworkType {
  Unknown = 0,
  STA = 1,
  AP = 2,
}
export interface WifiCredentials {
  ssid: string;
  password: string;
}

export interface ConnectionResponseData {
  type: 'info';
  data: {
    uid: string;
    leds: number;
    network: NetworkType;
  };
}

export type ConnectionRequestData =
  | {
      type: 'wifi';
      data: WifiCredentials;
    }
  | {
      type: 'frame';
      data: LightsFrame;
    };

export type ConnectionRequestDataType = ConnectionRequestData['type'];
