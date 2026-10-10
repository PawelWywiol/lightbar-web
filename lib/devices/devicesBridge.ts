import { resolveConnectedDeviceApiUrl } from './devicesApi';

const BRIDGE_READY_TIMEOUT = 15_000;
const BRIDGE_REQUEST_TIMEOUT = 5_000;

type BridgeRequest = { type: 'info' } | { type: 'send'; bytes: Uint8Array };

interface BridgeResponse {
  id?: unknown;
  type?: unknown;
  data?: unknown;
  ok?: unknown;
}

interface Bridge {
  target: Window;
  origin: string;
  pending: Map<number, (response: BridgeResponse) => void>;
  onReady?: () => void;
}

const bridges = new Map<string, Bridge>();
let nextRequestId = 1;
let isListening = false;

const resolveDeviceOrigin = (url: string) =>
  new URL(resolveConnectedDeviceApiUrl(url), globalThis.location.href).origin;

const withTimeout = <T>(promise: Promise<T>, timeout: number, fallback: T) =>
  Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeout))]);

const onBridgeMessage = ({ origin, source, data }: MessageEvent) => {
  const bridge = bridges.get(origin);

  if (!bridge || source !== bridge.target) {
    return;
  }

  const response = (data ?? {}) as BridgeResponse;

  if (response.type === 'ready') {
    bridge.onReady?.();
    return;
  }

  if (typeof response.id === 'number') {
    bridge.pending.get(response.id)?.(response);
  }
};

const getOpenBridge = (url: string) => {
  const origin = resolveDeviceOrigin(url);
  const bridge = bridges.get(origin);

  if (bridge?.target.closed) {
    bridges.delete(origin);
    return undefined;
  }

  return bridge;
};

export const hasDeviceBridge = (url: string) => !!getOpenBridge(url);

export const openDeviceBridge = async (url: string): Promise<boolean> => {
  if (!isListening) {
    globalThis.addEventListener('message', onBridgeMessage);
    isListening = true;
  }

  const origin = resolveDeviceOrigin(url);
  const target = globalThis.open(
    `${origin}/#bridge=${encodeURIComponent(globalThis.location.origin)}`,
    `lightbar-bridge-${origin}`,
  );

  if (!target) {
    return false;
  }

  const bridge: Bridge = { target, origin, pending: new Map() };
  bridges.set(origin, bridge);

  const isReady = await withTimeout(
    new Promise<boolean>((resolve) => {
      bridge.onReady = () => resolve(true);
    }),
    BRIDGE_READY_TIMEOUT,
    false,
  );

  if (!isReady) {
    bridges.delete(origin);
  }

  return isReady;
};

const requestDeviceBridge = async (url: string, request: BridgeRequest): Promise<BridgeResponse | undefined> => {
  const bridge = getOpenBridge(url);

  if (!bridge) {
    return undefined;
  }

  const id = nextRequestId++;
  const response = new Promise<BridgeResponse>((resolve) => bridge.pending.set(id, resolve));

  bridge.target.postMessage({ id, ...request }, bridge.origin);

  const result = await withTimeout<BridgeResponse | undefined>(response, BRIDGE_REQUEST_TIMEOUT, undefined);
  bridge.pending.delete(id);

  return result;
};

export const getDeviceBridgeInfo = async (url: string): Promise<unknown> => {
  const response = await requestDeviceBridge(url, { type: 'info' });

  return response?.type === 'info' ? response.data : undefined;
};

export const sendDeviceBridgeData = async (url: string, bytes: Uint8Array): Promise<boolean> => {
  const response = await requestDeviceBridge(url, { type: 'send', bytes });

  return response?.type === 'sent' && response.ok === true;
};
