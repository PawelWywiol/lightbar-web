import { z } from 'zod';
import type { LightsScheme } from '../lights/lights.types';
import { encodeScheme } from './schemeFormat';
import { invalidateOnlineSchemes } from './schemesApi';

const ADMIN_API_URL = '/api/admin';

const SessionSchema = z.object({ email: z.string(), isAdmin: z.boolean(), schemeIds: z.array(z.string()) });

export type Session = z.infer<typeof SessionSchema>;

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
  }
}

const isLoggedOut = (response: Response) => response.type === 'opaqueredirect' || response.status === 401;

export const getSession = async (): Promise<Session | undefined> => {
  const response = await fetch(`${ADMIN_API_URL}/me`, { redirect: 'manual', cache: 'no-store' });

  if (isLoggedOut(response) || !response.ok) {
    return undefined;
  }

  const result = SessionSchema.safeParse(await response.json());
  return result.success ? result.data : undefined;
};

const write = async (path: string, method: 'POST' | 'PUT' | 'DELETE', scheme?: LightsScheme) => {
  const response = await fetch(`${ADMIN_API_URL}${path}`, {
    method,
    redirect: 'manual',
    ...(scheme
      ? { headers: { 'Content-Type': 'application/octet-stream' }, body: encodeScheme(scheme) as BodyInit }
      : {}),
  });

  if (isLoggedOut(response)) {
    throw new SessionExpiredError();
  }

  if (!response.ok) {
    throw new Error(`Online scheme request failed: ${response.status}`);
  }

  invalidateOnlineSchemes();
  return response;
};

export const publishScheme = async (scheme: LightsScheme): Promise<string> => {
  const { id } = z.object({ id: z.string() }).parse(await (await write('/schemes', 'POST', scheme)).json());
  return id;
};

export const updateOnlineScheme = async (id: string, scheme: LightsScheme) => {
  await write(`/schemes/${encodeURIComponent(id)}`, 'PUT', scheme);
};

export const deleteOnlineScheme = async (id: string) => {
  await write(`/schemes/${encodeURIComponent(id)}`, 'DELETE');
};
