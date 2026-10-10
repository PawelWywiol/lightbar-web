import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LightColor, LightsScheme } from '../lights/lights.types';
import { decodeScheme } from './schemeFormat';
import {
  deleteOnlineScheme,
  getSession,
  publishScheme,
  SessionExpiredError,
  updateOnlineScheme,
} from './schemesAdminApi';

const scheme: LightsScheme = { name: 'Mine', frames: [{ type: 0, tempo: 60, colors: [1, 2] as LightColor[] }] };

const response = (init: { status?: number; type?: ResponseType; body?: unknown }) => ({
  ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
  status: init.status ?? 200,
  type: init.type ?? 'basic',
  json: async () => init.body,
});

const mockFetch = (init: Parameters<typeof response>[0]) => {
  const fetchMock = vi.fn(async () => response(init));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('schemesAdminApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns session for logged in editor', async () => {
    const fetchMock = mockFetch({ body: { email: 'a@b.c', isAdmin: false, schemeIds: ['x'] } });

    await expect(getSession()).resolves.toEqual({ email: 'a@b.c', isAdmin: false, schemeIds: ['x'] });
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/me', { redirect: 'manual', cache: 'no-store' });
  });

  it.each([
    ['access redirect', { type: 'opaqueredirect' as ResponseType, status: 0 }],
    ['unauthorized', { status: 401 }],
    ['invalid body', { body: { email: 1 } }],
  ])('returns no session on %s', async (_, init) => {
    mockFetch(init);

    await expect(getSession()).resolves.toBeUndefined();
  });

  it('publishes scheme bytes and returns id', async () => {
    const fetchMock = mockFetch({ status: 201, body: { id: 'new-id' } });

    await expect(publishScheme(scheme)).resolves.toBe('new-id');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/admin/schemes');
    expect(init).toMatchObject({
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    expect(decodeScheme(init.body as Uint8Array)).toEqual(scheme);
  });

  it('updates and deletes online scheme', async () => {
    const fetchMock = mockFetch({ status: 204 });

    await updateOnlineScheme('id-1', scheme);
    await deleteOnlineScheme('id-1');

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url, init]) => [url, init.method])).toEqual([
      ['/api/admin/schemes/id-1', 'PUT'],
      ['/api/admin/schemes/id-1', 'DELETE'],
    ]);
  });

  it('throws session expired on access redirect and error on failure', async () => {
    mockFetch({ type: 'opaqueredirect', status: 0 });
    await expect(deleteOnlineScheme('id-1')).rejects.toBeInstanceOf(SessionExpiredError);

    mockFetch({ status: 403 });
    await expect(deleteOnlineScheme('id-1')).rejects.toThrow('403');
  });
});
