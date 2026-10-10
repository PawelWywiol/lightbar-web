import { describe, expect, it, vi } from 'vitest';
import { handleApiRequest, type SchemesDatabase } from './api';

const createDatabase = (results: unknown[]) => {
  const bind = vi.fn(() => ({ all: async () => ({ results }) }));
  const prepare = vi.fn(() => ({ bind }));
  return { database: { prepare } as unknown as SchemesDatabase, prepare, bind };
};

const request = (path: string, method = 'GET') => new Request(`https://lightbar.wywiol.eu${path}`, { method });

describe('handleApiRequest', () => {
  it('lists schemes newest first with base64 data', async () => {
    const { database, prepare, bind } = createDatabase([
      { id: 'a', data: [1, 2, 3], updated_at: '2026-10-10T10:00:00.000Z' },
      { id: 'b', data: new Uint8Array([255]).buffer, updated_at: '2026-10-09T10:00:00.000Z' },
    ]);

    const response = await handleApiRequest(request('/api/schemes'), database);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await response.json()).toEqual([
      { id: 'a', updatedAt: '2026-10-10T10:00:00.000Z', data: 'AQID' },
      { id: 'b', updatedAt: '2026-10-09T10:00:00.000Z', data: '/w==' },
    ]);
    expect(prepare).toHaveBeenCalledWith('SELECT id, data, updated_at FROM schemes ORDER BY updated_at DESC LIMIT ?');
    expect(bind).toHaveBeenCalledWith(200);
  });

  it('rejects other methods', async () => {
    const { database, prepare } = createDatabase([]);

    const response = await handleApiRequest(request('/api/schemes', 'POST'), database);

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(prepare).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown api path', async () => {
    const { database } = createDatabase([]);

    const response = await handleApiRequest(request('/api/unknown'), database);

    expect(response.status).toBe(404);
  });
});
