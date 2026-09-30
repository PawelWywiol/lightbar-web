import type { z } from 'zod';

export type SetStorageData = (key: string, data: unknown) => void;

export type GetStorageData = <T>(key: string, validationSchema: z.Schema<T>, defaultValue: T) => T;
