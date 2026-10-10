// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import type { LightColor } from '../lib/lights/lights.types';
import { encodeScheme } from '../lib/schemes/schemeFormat';
import type { AccessIdentity } from './access';
import { type ApiContext, handleApiRequest } from './api';
import { createTestDatabase } from './testDatabase';

const ORIGIN = 'https://lightbar.wywiol.eu';
const AUTHOR = { sub: 'author', email: 'author@example.com' };
const OTHER = { sub: 'other', email: 'other@example.com' };
const ADMIN = { sub: 'admin', email: 'Admin@Example.com' };

const schemeBytes = (name: string) =>
  encodeScheme({ name, frames: [{ type: 0, tempo: 60, colors: [1, 2] as LightColor[] }] });

const request = (path: string, init: RequestInit & { identity?: AccessIdentity } = {}) => {
  const { identity, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (identity) headers.set('x-test-identity', JSON.stringify(identity));
  return new Request(`${ORIGIN}${path}`, { ...rest, headers });
};

const write = (path: string, method: string, identity: AccessIdentity, body?: Uint8Array, headers = {}) =>
  request(path, {
    method,
    identity,
    headers: { Origin: ORIGIN, 'Content-Type': 'application/octet-stream', ...headers },
    ...(body ? { body: body as BodyInit } : {}),
  });

let context: ApiContext;
let sqlite: ReturnType<typeof createTestDatabase>['sqlite'];

const createAs = async (identity: AccessIdentity, name = 'Mine') => {
  const response = await handleApiRequest(write('/api/admin/schemes', 'POST', identity, schemeBytes(name)), context);
  return ((await response.json()) as { id: string }).id;
};

describe('handleApiRequest', () => {
  beforeEach(() => {
    const testDatabase = createTestDatabase();
    sqlite = testDatabase.sqlite;
    context = {
      database: testDatabase.database,
      authenticate: async (incoming) => {
        const identity = incoming.headers.get('x-test-identity');
        return identity ? (JSON.parse(identity) as AccessIdentity) : undefined;
      },
      adminEmails: ['admin@example.com'],
    };
  });

  describe('public', () => {
    it('lists seeded schemes newest first with security headers', async () => {
      const response = await handleApiRequest(request('/api/schemes'), context);
      const list = (await response.json()) as { id: string; data: string }[];

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(list).toHaveLength(10);
      expect(list[0]?.id).toBe('preset-christmas-blink');
    });

    it('rejects other methods and unknown paths', async () => {
      expect((await handleApiRequest(request('/api/schemes', { method: 'POST' }), context)).status).toBe(405);
      expect((await handleApiRequest(request('/api/unknown'), context)).status).toBe(404);
    });
  });

  describe('admin', () => {
    it('requires authentication', async () => {
      const response = await handleApiRequest(request('/api/admin/me'), context);

      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('redirects login to schemes page', async () => {
      const response = await handleApiRequest(request('/api/admin/login', { identity: AUTHOR }), context);

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(`${ORIGIN}/schemes`);
    });

    it('creates scheme owned by author and reports it in me', async () => {
      const id = await createAs(AUTHOR);

      const me = await handleApiRequest(request('/api/admin/me', { identity: AUTHOR }), context);
      const row = sqlite.prepare('SELECT owner FROM schemes WHERE id = ?').get(id) as { owner: string };

      expect(await me.json()).toEqual({ email: AUTHOR.email, isAdmin: false, schemeIds: [id] });
      expect(row.owner).toBe(AUTHOR.sub);
    });

    it('marks admin case-insensitively', async () => {
      const me = await handleApiRequest(request('/api/admin/me', { identity: ADMIN }), context);

      expect(((await me.json()) as { isAdmin: boolean }).isAdmin).toBe(true);
    });

    it('lets author update and delete own scheme', async () => {
      const id = await createAs(AUTHOR);

      const updated = await handleApiRequest(
        write(`/api/admin/schemes/${id}`, 'PUT', AUTHOR, schemeBytes('Renamed')),
        context,
      );
      const deleted = await handleApiRequest(write(`/api/admin/schemes/${id}`, 'DELETE', AUTHOR), context);

      expect(updated.status).toBe(204);
      expect(deleted.status).toBe(204);
      expect(sqlite.prepare('SELECT count(*) AS n FROM schemes WHERE id = ?').get(id)).toEqual({ n: 0 });
    });

    it('forbids changing foreign schemes and presets for non admin', async () => {
      const id = await createAs(AUTHOR);

      const foreign = await handleApiRequest(write(`/api/admin/schemes/${id}`, 'DELETE', OTHER), context);
      const preset = await handleApiRequest(
        write('/api/admin/schemes/preset-fire', 'PUT', AUTHOR, schemeBytes('Hijack')),
        context,
      );

      expect(foreign.status).toBe(403);
      expect(preset.status).toBe(403);
    });

    it('lets admin change any scheme', async () => {
      const id = await createAs(AUTHOR);

      expect((await handleApiRequest(write(`/api/admin/schemes/${id}`, 'DELETE', ADMIN), context)).status).toBe(204);
      expect(
        (await handleApiRequest(write('/api/admin/schemes/preset-fire', 'PUT', ADMIN, schemeBytes('Fire 2')), context))
          .status,
      ).toBe(204);
    });

    it('returns 404 for unknown scheme', async () => {
      const response = await handleApiRequest(write('/api/admin/schemes/missing', 'DELETE', ADMIN), context);

      expect(response.status).toBe(404);
    });

    it('rejects cross-origin writes, wrong content type, invalid and oversized bodies', async () => {
      const crossOrigin = await handleApiRequest(
        write('/api/admin/schemes', 'POST', AUTHOR, schemeBytes('x'), { Origin: 'https://evil.example' }),
        context,
      );
      const wrongType = await handleApiRequest(
        write('/api/admin/schemes', 'POST', AUTHOR, schemeBytes('x'), { 'Content-Type': 'text/plain' }),
        context,
      );
      const invalid = await handleApiRequest(
        write('/api/admin/schemes', 'POST', AUTHOR, new Uint8Array([1, 2, 3])),
        context,
      );
      const oversized = await handleApiRequest(
        write('/api/admin/schemes', 'POST', AUTHOR, new Uint8Array(80 * 1024 + 1)),
        context,
      );

      expect(crossOrigin.status).toBe(403);
      expect(wrongType.status).toBe(415);
      expect(invalid.status).toBe(400);
      expect(oversized.status).toBe(413);
    });
  });
});
