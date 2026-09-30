import type { z } from 'zod';

export const getStorage = (): Storage | undefined => {
  return typeof globalThis === 'undefined' ? undefined : globalThis.localStorage;
};

export const parseStorageValue = (storageValue: string): unknown => {
  return JSON.parse(storageValue);
};

export const validateData = <T>(data: unknown, validationSchema: z.Schema<T>): T | undefined => {
  const validationResult = validationSchema.safeParse(data);
  return validationResult.success ? validationResult.data : undefined;
};
