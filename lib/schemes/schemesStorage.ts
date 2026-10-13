import { z } from 'zod';
import type { LightsSchemeData } from '../lights/lights.types';
import { fromBase64, toBase64 } from '../utils/base64/base64';
import { getStorageData, setStorageData } from '../utils/storage/storage';
import { decodeScheme, encodeScheme } from './schemeFormat';

const LOCAL_SCHEMES_STORAGE_KEY = 'schemes:local';

const LocalSchemeSchema = z.object({ uid: z.string(), updatedAt: z.string(), data: z.string() });

type LocalScheme = z.infer<typeof LocalSchemeSchema>;

const loadLocalSchemes = (): LocalScheme[] =>
  getStorageData(LOCAL_SCHEMES_STORAGE_KEY, z.array(z.unknown()), [] as unknown[]).flatMap((entry) => {
    const result = LocalSchemeSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });

const decodeLocalScheme = ({ uid, updatedAt, data }: LocalScheme): LightsSchemeData | undefined => {
  const scheme = decodeScheme(fromBase64(data));
  return scheme ? { uid, updatedAt, scheme } : undefined;
};

export const getLocalSchemes = (): LightsSchemeData[] =>
  loadLocalSchemes()
    .flatMap((entry) => decodeLocalScheme(entry) ?? [])
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const getLocalScheme = (uid: string): LightsSchemeData | undefined => {
  const entry = loadLocalSchemes().find((scheme) => scheme.uid === uid);
  return entry ? decodeLocalScheme(entry) : undefined;
};

export const saveLocalScheme = ({ uid, updatedAt, scheme }: LightsSchemeData) => {
  setStorageData(LOCAL_SCHEMES_STORAGE_KEY, [
    ...loadLocalSchemes().filter((entry) => entry.uid !== uid),
    { uid, updatedAt, data: toBase64(encodeScheme(scheme)) },
  ]);
};

export const removeLocalScheme = (uid: string) => {
  setStorageData(
    LOCAL_SCHEMES_STORAGE_KEY,
    loadLocalSchemes().filter((entry) => entry.uid !== uid),
  );
};

const FAVORITE_SCHEMES_STORAGE_KEY = 'schemes:favorites';

export const getFavoriteSchemeIds = (): string[] =>
  getStorageData(FAVORITE_SCHEMES_STORAGE_KEY, z.array(z.string()), [] as string[]);

export const toggleFavoriteScheme = (uid: string): string[] => {
  const ids = getFavoriteSchemeIds();
  const next = ids.includes(uid) ? ids.filter((id) => id !== uid) : [...ids, uid];
  setStorageData(FAVORITE_SCHEMES_STORAGE_KEY, next);
  return next;
};

const LAST_SENT_SCHEME_STORAGE_KEY = 'schemes:last-sent';

export const getLastSentScheme = (): LightsSchemeData | undefined => {
  const entry = LocalSchemeSchema.safeParse(getStorageData(LAST_SENT_SCHEME_STORAGE_KEY, z.unknown(), undefined));
  return entry.success ? decodeLocalScheme(entry.data) : undefined;
};

export const saveLastSentScheme = ({ uid, scheme }: Pick<LightsSchemeData, 'uid' | 'scheme'>) => {
  setStorageData(LAST_SENT_SCHEME_STORAGE_KEY, {
    uid,
    updatedAt: new Date().toISOString(),
    data: toBase64(encodeScheme(scheme)),
  });
};
