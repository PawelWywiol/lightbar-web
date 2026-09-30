export const CONNECTED_DEVICES_STORAGE_KEY = (type: 'devices' | 'selected') =>
  `connectedDevices:${type}`;
export const CONNECTED_DEVICE_API_DEFAULT_SCHEMA = 'http';
export const CONNECTED_DEVICE_API_DEFAULT_PATH = '/api/lightbar';
export const CONNECTED_DEVICE_API_DEFAULT_URL = '/api/lightbar';
export const CONNECTED_DEVICE_GET_STATE_INTERVAL = 300_000;
