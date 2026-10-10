import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LightColor, LightsScheme } from '../lights/lights.types';
import { toBase64 } from '../utils/base64/base64';
import { encodeScheme } from './schemeFormat';
import { getOnlineScheme, getOnlineSchemes } from './schemesApi';

const scheme: LightsScheme = { name: 'Online', frames: [{ type: 0, tempo: 60, colors: [1, 2] as LightColor[] }] };

const mockFetch = (body: unknown, ok = true) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body })),
  );

describe('schemesApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('decodes online schemes and skips broken ones', async () => {
    mockFetch([
      { id: 'a', updatedAt: '2026-10-10T10:00:00.000Z', data: toBase64(encodeScheme(scheme)) },
      { id: 'b', updatedAt: '2026-10-10T09:00:00.000Z', data: 'AAAA' },
    ]);

    await expect(getOnlineSchemes()).resolves.toEqual([{ uid: 'a', updatedAt: '2026-10-10T10:00:00.000Z', scheme }]);
    expect(fetch).toHaveBeenCalledWith('/api/schemes');
  });

  it('finds online scheme by id', async () => {
    mockFetch([{ id: 'a', updatedAt: '2026-10-10T10:00:00.000Z', data: toBase64(encodeScheme(scheme)) }]);

    await expect(getOnlineScheme('a')).resolves.toMatchObject({ uid: 'a', scheme });
    await expect(getOnlineScheme('missing')).resolves.toBeUndefined();
  });

  it('rejects on failed response or invalid body', async () => {
    mockFetch([], false);
    await expect(getOnlineSchemes()).rejects.toThrow();

    mockFetch({ not: 'a list' });
    await expect(getOnlineSchemes()).rejects.toThrow();
  });
});
