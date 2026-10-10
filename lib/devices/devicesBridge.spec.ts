import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDeviceBridgeInfo, hasDeviceBridge, openDeviceBridge, sendDeviceBridgeData } from './devicesBridge';

interface FakeTarget {
  closed: boolean;
  postMessage: ReturnType<typeof vi.fn>;
}

const createTarget = (): FakeTarget => ({ closed: false, postMessage: vi.fn() });

const reply = (origin: string, source: FakeTarget, data: unknown) => {
  window.dispatchEvent(new MessageEvent('message', { origin, data, source: source as unknown as Window }));
};

const openReady = async (ip: string) => {
  const target = createTarget();
  vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window);
  const opened = openDeviceBridge(ip);
  reply(`http://${ip}`, target, { type: 'ready' });
  await expect(opened).resolves.toBe(true);
  return target;
};

describe('devicesBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens device page with app origin in hash and resolves on ready', async () => {
    const target = await openReady('192.168.0.10');

    expect(window.open).toHaveBeenCalledWith(
      `http://192.168.0.10/#bridge=${encodeURIComponent(window.location.origin)}`,
      'lightbar-bridge-http://192.168.0.10',
    );
    expect(hasDeviceBridge('192.168.0.10')).toBe(true);
    expect(target.postMessage).not.toHaveBeenCalled();
  });

  it('resolves false when window is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    await expect(openDeviceBridge('192.168.0.11')).resolves.toBe(false);
    expect(hasDeviceBridge('192.168.0.11')).toBe(false);
  });

  it('resolves false when ready never arrives', async () => {
    vi.spyOn(window, 'open').mockReturnValue(createTarget() as unknown as Window);
    const opened = openDeviceBridge('192.168.0.12');

    await vi.advanceTimersByTimeAsync(15_000);

    await expect(opened).resolves.toBe(false);
    expect(hasDeviceBridge('192.168.0.12')).toBe(false);
  });

  it('ignores ready from foreign origin or source', async () => {
    const target = createTarget();
    vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window);
    const opened = openDeviceBridge('192.168.0.13');

    reply('http://192.168.0.99', target, { type: 'ready' });
    reply('http://192.168.0.13', createTarget(), { type: 'ready' });
    await vi.advanceTimersByTimeAsync(15_000);

    await expect(opened).resolves.toBe(false);
  });

  it('gets device info through bridge', async () => {
    const target = await openReady('192.168.0.14');
    const info = getDeviceBridgeInfo('192.168.0.14');
    const [[message, targetOrigin]] = target.postMessage.mock.calls as [[{ id: number; type: string }, string]];

    expect(message.type).toBe('info');
    expect(targetOrigin).toBe('http://192.168.0.14');

    reply('http://192.168.0.14', target, { id: message.id, type: 'info', data: { type: 'info' } });

    await expect(info).resolves.toEqual({ type: 'info' });
  });

  it('sends bytes through bridge', async () => {
    const target = await openReady('192.168.0.15');
    const bytes = new Uint8Array([1, 2]);
    const sent = sendDeviceBridgeData('192.168.0.15', bytes);
    const [[message]] = target.postMessage.mock.calls as [[{ id: number; type: string; bytes: Uint8Array }]];

    expect(message).toMatchObject({ type: 'send', bytes });

    reply('http://192.168.0.15', target, { id: message.id, type: 'sent', ok: true });

    await expect(sent).resolves.toBe(true);
  });

  it('resolves request as failed on timeout or error response', async () => {
    const target = await openReady('192.168.0.16');
    const info = getDeviceBridgeInfo('192.168.0.16');
    const sent = sendDeviceBridgeData('192.168.0.16', new Uint8Array([1]));
    const [, [sendMessage]] = target.postMessage.mock.calls as [unknown, [{ id: number }]];

    reply('http://192.168.0.16', target, { id: sendMessage.id, type: 'error' });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(info).resolves.toBeUndefined();
    await expect(sent).resolves.toBe(false);
  });

  it('drops bridge when window is closed', async () => {
    const target = await openReady('192.168.0.17');
    target.closed = true;

    expect(hasDeviceBridge('192.168.0.17')).toBe(false);
    await expect(getDeviceBridgeInfo('192.168.0.17')).resolves.toBeUndefined();
    expect(target.postMessage).not.toHaveBeenCalled();
  });
});
