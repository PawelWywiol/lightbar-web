import { z } from 'zod';
import type { LightsSchemeData } from '../lights/lights.types';
import { fromBase64 } from '../utils/base64/base64';
import { decodeScheme } from './schemeFormat';

const ONLINE_SCHEMES_URL = '/api/schemes';

const OnlineSchemesSchema = z.array(z.object({ id: z.string(), updatedAt: z.string(), data: z.string() }));

let shouldReload = false;

export const invalidateOnlineSchemes = () => {
  shouldReload = true;
};

export const getOnlineSchemes = async (): Promise<LightsSchemeData[]> => {
  const response = await fetch(ONLINE_SCHEMES_URL, { cache: shouldReload ? 'reload' : 'default' });
  shouldReload = false;

  if (!response.ok) {
    throw new Error(`Online schemes request failed: ${response.status}`);
  }

  return OnlineSchemesSchema.parse(await response.json()).flatMap(({ id, updatedAt, data }) => {
    const scheme = decodeScheme(fromBase64(data));
    return scheme ? [{ uid: id, updatedAt, scheme }] : [];
  });
};

export const getOnlineScheme = async (id: string) => (await getOnlineSchemes()).find(({ uid }) => uid === id);
