import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionRequestData } from '../connections/connections.types';
import type { LightColor } from '../lights/lights.types';
import { useConnectedDeviceData } from './devices.hooks';
import { getConnectedDeviceData } from './devicesApi';
import { getDeviceBridgeInfo, hasDeviceBridge, sendDeviceBridgeData } from './devicesBridge';

vi.mock('./devicesBridge', () => ({
  hasDeviceBridge: vi.fn(),
  getDeviceBridgeInfo: vi.fn(),
  sendDeviceBridgeData: vi.fn(),
}));

vi.mock('./devicesApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./devicesApi')>()),
  getConnectedDeviceData: vi.fn(),
}));

const INFO = { type: 'info', data: { uid: 'a', leds: 8, network: 1 } } as const;
const FRAME: ConnectionRequestData = {
  type: 'frame',
  data: { type: 0, shuffle: false, hueShift: 0, pixelShift: 0, repeat: 0, tempo: 60, colors: [1 as LightColor] },
};

describe('useConnectedDeviceData with bridge', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(hasDeviceBridge).mockReturnValue(true);
    vi.mocked(getDeviceBridgeInfo).mockResolvedValue(INFO);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('reads device info through bridge', async () => {
    const { result } = renderHook(() => useConnectedDeviceData({ url: '192.168.0.30', updateInterval: 0 }));

    await waitFor(() => expect(result.current.status).toBe('CONNECTED'));
    expect(result.current.info).toEqual(INFO);
    expect(getConnectedDeviceData).not.toHaveBeenCalled();
  });

  it('sends frames through bridge', async () => {
    vi.mocked(sendDeviceBridgeData).mockResolvedValue(true);
    const { result } = renderHook(() => useConnectedDeviceData({ url: '192.168.0.30', updateInterval: 0 }));
    await waitFor(() => expect(result.current.status).toBe('CONNECTED'));

    await act(() => result.current.send([FRAME]));

    expect(sendDeviceBridgeData).toHaveBeenCalledWith('192.168.0.30', expect.any(Uint8Array));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('CONNECTED');
  });

  it('closes connection when bridge send fails', async () => {
    vi.mocked(sendDeviceBridgeData).mockResolvedValue(false);
    const { result } = renderHook(() => useConnectedDeviceData({ url: '192.168.0.30', updateInterval: 0 }));
    await waitFor(() => expect(result.current.status).toBe('CONNECTED'));

    await act(() => result.current.send([FRAME]));

    expect(result.current.status).toBe('CLOSED');
    expect(result.current.info).toBeUndefined();
  });
});

const adjustRequest = (brightness: number): ConnectionRequestData => ({
  type: 'adjust',
  data: { brightness, speed: 100, hue: 0 },
});

const sentBody = async (call: unknown[]) => [
  ...new Uint8Array(await ((call[1] as RequestInit).body as Blob).arrayBuffer()),
];

const createDeferredResponse = () => {
  const deferred = {} as { promise: Promise<Response>; resolve: (response: Response) => void };
  deferred.promise = new Promise<Response>((resolve) => {
    deferred.resolve = resolve;
  });

  return deferred;
};

describe('useConnectedDeviceData without bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sends one request at a time and only the newest pending state', async () => {
    vi.mocked(hasDeviceBridge).mockReturnValue(false);
    vi.mocked(getConnectedDeviceData).mockResolvedValue(INFO);
    const firstResponse = createDeferredResponse();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstResponse.promise)
      .mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useConnectedDeviceData({ url: '192.168.0.30', updateInterval: 0 }));
    await waitFor(() => expect(result.current.status).toBe('CONNECTED'));

    let first = Promise.resolve();
    await act(async () => {
      first = result.current.send([adjustRequest(10)]);
      await result.current.send([adjustRequest(20)]);
      await result.current.send([FRAME]);
      await result.current.send([adjustRequest(30)]);
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    await act(async () => {
      firstResponse.resolve(new Response());
      await first;
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = await sentBody(fetchMock.mock.calls[1] as unknown[]);
    expect(body.slice(8, 11)).toEqual([30, 100, 0]);
    expect(body).toHaveLength(15 + 12 + 4 + 1);
    expect(result.current.status).toBe('CONNECTED');
    expect(result.current.info).toEqual(INFO);
  });

  it('drops pending state when the device stops responding', async () => {
    vi.mocked(hasDeviceBridge).mockReturnValue(false);
    vi.mocked(getConnectedDeviceData).mockResolvedValue(INFO);
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useConnectedDeviceData({ url: '192.168.0.30', updateInterval: 0 }));
    await waitFor(() => expect(result.current.status).toBe('CONNECTED'));

    await act(async () => {
      await Promise.all([result.current.send([adjustRequest(10)]), result.current.send([adjustRequest(20)])]);
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('CLOSED');
    expect(result.current.info).toBeUndefined();
  });
});
