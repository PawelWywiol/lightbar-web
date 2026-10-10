import { decodeScheme } from '../lib/schemes/schemeFormat';
import { toBase64 } from '../lib/utils/base64/base64';
import { type AccessIdentity, type Authenticate, createAccessAuthenticator } from './access';

const SCHEMES_LIMIT = 200;
const SCHEME_MAX_BYTES = 80 * 1024;
const ADMIN_PREFIX = '/api/admin';
const SCHEME_PATH = /^\/schemes\/([\w-]+)$/;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

interface SchemeRow {
  id: string;
  data: ArrayBuffer | ArrayLike<number>;
  updated_at: string;
}

interface PreparedStatement {
  all: <T>() => Promise<{ results: T[] }>;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
}

export interface SchemesDatabase {
  prepare: (query: string) => { bind: (...values: unknown[]) => PreparedStatement };
}

export interface ApiContext {
  database: SchemesDatabase;
  authenticate: Authenticate;
  adminEmails: string[];
}

interface Env {
  DB: SchemesDatabase;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers });

const error = (status: number, message: string, headers: Record<string, string> = {}) =>
  json({ error: message }, status, headers);

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

const handlePublicRequest = async (request: Request, { database }: ApiContext) => {
  if (request.method !== 'GET') {
    return error(405, 'Method not allowed', { Allow: 'GET' });
  }

  return json(await listSchemes(database), 200, { 'Cache-Control': 'public, max-age=60' });
};

const readSchemeBody = async (request: Request): Promise<Uint8Array | Response> => {
  if (request.headers.get('Content-Type') !== 'application/octet-stream') {
    return error(415, 'Unsupported media type');
  }

  if (Number(request.headers.get('Content-Length') ?? 0) > SCHEME_MAX_BYTES) {
    return error(413, 'Scheme too large');
  }

  const bytes = new Uint8Array(await request.arrayBuffer());

  if (bytes.length > SCHEME_MAX_BYTES) {
    return error(413, 'Scheme too large');
  }

  return decodeScheme(bytes) ? bytes : error(400, 'Invalid scheme');
};

const createScheme = async (request: Request, identity: AccessIdentity, { database }: ApiContext) => {
  const body = await readSchemeBody(request);

  if (body instanceof Response) {
    return body;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await database
    .prepare('INSERT INTO schemes (id, data, created_at, updated_at, owner) VALUES (?, ?, ?, ?, ?)')
    .bind(id, body, now, now, identity.sub)
    .run();

  return json({ id }, 201);
};

const changeScheme = async (
  request: Request,
  id: string,
  identity: AccessIdentity,
  isAdmin: boolean,
  { database }: ApiContext,
) => {
  const row = await database
    .prepare('SELECT owner FROM schemes WHERE id = ?')
    .bind(id)
    .first<{ owner: string | null }>();

  if (!row) {
    return error(404, 'Not found');
  }

  if (!isAdmin && row.owner !== identity.sub) {
    return error(403, 'Forbidden');
  }

  if (request.method === 'DELETE') {
    await database.prepare('DELETE FROM schemes WHERE id = ?').bind(id).run();
    return new Response(null, { status: 204 });
  }

  const body = await readSchemeBody(request);

  if (body instanceof Response) {
    return body;
  }

  await database
    .prepare('UPDATE schemes SET data = ?, updated_at = ? WHERE id = ?')
    .bind(body, new Date().toISOString(), id)
    .run();

  return new Response(null, { status: 204 });
};

const handleAdminRequest = async (request: Request, url: URL, context: ApiContext) => {
  const identity = await context.authenticate(request);

  if (!identity) {
    return error(401, 'Unauthorized');
  }

  const isAdmin = context.adminEmails.includes(identity.email.toLowerCase());
  const path = url.pathname.slice(ADMIN_PREFIX.length);

  if (request.method === 'GET') {
    if (path === '/login') {
      return Response.redirect(new URL('/schemes', url).toString(), 302);
    }

    if (path === '/me') {
      const { results } = await context.database
        .prepare('SELECT id FROM schemes WHERE owner = ? ORDER BY updated_at DESC')
        .bind(identity.sub)
        .all<{ id: string }>();
      return json({ email: identity.email, isAdmin, schemeIds: results.map(({ id }) => id) });
    }

    return error(404, 'Not found');
  }

  if (request.headers.get('Origin') !== url.origin) {
    return error(403, 'Forbidden');
  }

  if (path === '/schemes' && request.method === 'POST') {
    return createScheme(request, identity, context);
  }

  const id = SCHEME_PATH.exec(path)?.[1];

  if (id && (request.method === 'PUT' || request.method === 'DELETE')) {
    return changeScheme(request, id, identity, isAdmin, context);
  }

  return error(404, 'Not found');
};

const withHeaders = (response: Response, headers: Record<string, string>) => {
  const result = new Response(response.body, response);
  Object.entries(headers).forEach(([name, value]) => result.headers.set(name, value));
  return result;
};

export const handleApiRequest = async (request: Request, context: ApiContext) => {
  const url = new URL(request.url);

  if (url.pathname === '/api/schemes') {
    return withHeaders(await handlePublicRequest(request, context), SECURITY_HEADERS);
  }

  if (url.pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return withHeaders(await handleAdminRequest(request, url, context), {
      ...SECURITY_HEADERS,
      'Cache-Control': 'no-store',
    });
  }

  return withHeaders(error(404, 'Not found'), SECURITY_HEADERS);
};

const authenticators = new Map<string, Authenticate>();

const getAuthenticator = ({ ACCESS_TEAM_DOMAIN = '', ACCESS_AUD = '' }: Env) => {
  const key = `${ACCESS_TEAM_DOMAIN}|${ACCESS_AUD}`;
  const authenticator =
    authenticators.get(key) ?? createAccessAuthenticator({ teamDomain: ACCESS_TEAM_DOMAIN, audience: ACCESS_AUD });
  authenticators.set(key, authenticator);
  return authenticator;
};

const parseAdminEmails = (value = '') =>
  value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export default {
  fetch: (request: Request, env: Env) =>
    handleApiRequest(request, {
      database: env.DB,
      authenticate: getAuthenticator(env),
      adminEmails: parseAdminEmails(env.ADMIN_EMAILS),
    }),
};
