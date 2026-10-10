import { z } from 'zod';
import type { LightsSchemeData } from '../lights/lights.types';
import { getStorageData, setStorageData } from '../utils/storage/storage';
import { decodeScheme, encodeScheme } from './schemeFormat';

const LOCAL_SCHEMES_STORAGE_KEY = 'schemes:local';

const LocalSchemeSchema = z.object({ uid: z.string(), updatedAt: z.string(), data: z.string() });

type LocalScheme = z.infer<typeof LocalSchemeSchema>;

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(''));

const fromBase64 = (value: string) => {
  try {
    return Uint8Array.from(atob(value), (character) => character.codePointAt(0) ?? 0);
  } catch {
    return new Uint8Array();
  }
};

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
