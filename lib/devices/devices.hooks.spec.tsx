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
const FRAME: ConnectionRequestData = { type: 'frame', data: { type: 0, tempo: 60, colors: [1 as LightColor] } };

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
