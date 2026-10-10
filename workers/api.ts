import { toBase64 } from '../lib/utils/base64/base64';

const SCHEMES_LIMIT = 200;

interface SchemeRow {
  id: string;
  data: ArrayBuffer | number[];
  updated_at: string;
}

export interface SchemesDatabase {
  prepare: (query: string) => {
    bind: (...values: unknown[]) => { all: <T>() => Promise<{ results: T[] }> };
  };
}

interface Env {
  DB: SchemesDatabase;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers });

const listSchemes = async (database: SchemesDatabase) => {
  const { results } = await database
    .prepare('SELECT id, data, updated_at FROM schemes ORDER BY updated_at DESC LIMIT ?')
    .bind(SCHEMES_LIMIT)
    .all<SchemeRow>();

  return results.map(({ id, data, updated_at }) => ({
    id,
    updatedAt: updated_at,
    data: toBase64(new Uint8Array(data)),
  }));
};

export const handleApiRequest = async (request: Request, database: SchemesDatabase) => {
  if (new URL(request.url).pathname !== '/api/schemes') {
    return json({ error: 'Not found' }, 404);
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
  }

  return json(await listSchemes(database), 200, { 'Cache-Control': 'public, max-age=60' });
};

export default {
  fetch: (request: Request, env: Env) => handleApiRequest(request, env.DB),
};
