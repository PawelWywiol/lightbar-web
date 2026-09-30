import type { ConnectionResponseData } from '../connections/connections.types';
import { isConnectionResponseData } from '../connections/connections.utils';
import {
  CONNECTED_DEVICE_API_DEFAULT_PATH,
  CONNECTED_DEVICE_API_DEFAULT_SCHEMA,
} from './devices.config';

export const isIPAddress = (value: string) => {
  const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;

  return ipRegex.test(value);
};

export const isUrl = (value: string) =>
  value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');

export const resolveConnectedDeviceApiUrl = (
  url: string,
  schema: string = CONNECTED_DEVICE_API_DEFAULT_SCHEMA,
  path: string = CONNECTED_DEVICE_API_DEFAULT_PATH,
): string => {
  if (isIPAddress(url)) {
    return `${schema}://${url}${path}`;
  }

  return isUrl(url) ? url : `${schema}://${url}${path}`;
};

export const getConnectedDeviceData = async (
  url: string,
): Promise<ConnectionResponseData | undefined> => {
  try {
    const response = await fetch(resolveConnectedDeviceApiUrl(url), {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn(`Device request failed: ${response.status} ${response.statusText}`);
      return undefined;
    }

    const responseJson = (await response.json()) as unknown;

    return isConnectionResponseData(responseJson) ? responseJson : undefined;
  } catch (error) {
    console.warn('Device connection error:', error);
  }

  return undefined;
};
