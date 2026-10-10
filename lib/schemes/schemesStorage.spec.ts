import { beforeEach, describe, expect, it } from 'vitest';
import type { LightColor, LightsSchemeData } from '../lights/lights.types';
import { getLocalScheme, getLocalSchemes, removeLocalScheme, saveLocalScheme } from './schemesStorage';

const STORAGE_KEY = 'schemes:local';

const schemeData = (uid: string, updatedAt: string, name = uid): LightsSchemeData => ({
  uid,
  updatedAt,
  scheme: { name, frames: [{ type: 0, tempo: 60, colors: [1, 2] as LightColor[] }] },
});

describe('schemesStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty list when nothing saved', () => {
    expect(getLocalSchemes()).toEqual([]);
  });

  it('saves scheme as base64 device bytes and reads it back', () => {
    const data = schemeData('a', '2026-10-10T10:00:00.000Z', 'Tęcza');

    saveLocalScheme(data);

    const [stored] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { data: string }[];
    expect(typeof stored?.data).toBe('string');
    expect(getLocalScheme('a')).toEqual(data);
  });

  it('overwrites scheme with same uid', () => {
    saveLocalScheme(schemeData('a', '2026-10-10T10:00:00.000Z', 'old'));
    saveLocalScheme(schemeData('a', '2026-10-10T11:00:00.000Z', 'new'));

    expect(getLocalSchemes()).toEqual([schemeData('a', '2026-10-10T11:00:00.000Z', 'new')]);
  });

  it('lists newest first', () => {
    saveLocalScheme(schemeData('old', '2026-10-10T10:00:00.000Z'));
    saveLocalScheme(schemeData('new', '2026-10-10T12:00:00.000Z'));

    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['new', 'old']);
  });

  it('ignores invalid entries', () => {
    saveLocalScheme(schemeData('ok', '2026-10-10T10:00:00.000Z'));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...stored, { uid: 'bad', updatedAt: 'x', data: 'AAAA' }, { uid: 1 }, 'junk']),
    );

    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['ok']);
    expect(getLocalScheme('bad')).toBeUndefined();
  });

  it('removes scheme', () => {
    saveLocalScheme(schemeData('a', '2026-10-10T10:00:00.000Z'));
    saveLocalScheme(schemeData('b', '2026-10-10T11:00:00.000Z'));

    removeLocalScheme('a');

    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['b']);
  });
});
