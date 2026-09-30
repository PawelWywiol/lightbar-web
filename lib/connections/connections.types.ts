import type { Message } from '../config/messages.types';
import type { LightsFrame } from '../lights/lights.types';

export type ConnectionType = 'CLOSED' | 'CONNECTING' | 'CONNECTED' | 'PROCESSING';
export enum NetworkType {
  Unknown = 0,
  STA = 1,
  AP = 2,
}
export interface WifiCredentials {
  ssid: string;
  password: string;
}

export type ConnectionCustomEventDispatch =
  | {
      name: 'app:connection:status';
      detail: {
        target: string;
        status: ConnectionType;
      };
    }
  | {
      name: 'app:connection:message';
      detail: {
        target: string;
        message?: Message | undefined;
      };
    };

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
