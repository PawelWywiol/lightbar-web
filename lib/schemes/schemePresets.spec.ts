import { describe, expect, it } from 'vitest';
import { LIGHTS_SCHEME_NAME_MAX_LENGTH } from '../lights/lights.config';
import { decodeScheme, encodeScheme } from './schemeFormat';
import { getSchemePreset, SCHEME_PRESETS } from './schemePresets';

describe('SCHEME_PRESETS', () => {
  it('has 10 presets with unique uids', () => {
    expect(SCHEME_PRESETS).toHaveLength(10);
    expect(new Set(SCHEME_PRESETS.map(({ uid }) => uid)).size).toBe(10);
  });

  it.each(SCHEME_PRESETS.map((preset) => [preset.scheme.name, preset] as const))(
    '%s is a valid 16 light scheme',
    (_, { scheme }) => {
      expect(scheme.name.length).toBeLessThanOrEqual(LIGHTS_SCHEME_NAME_MAX_LENGTH);
      expect(scheme.frames.length).toBeGreaterThan(1);
      expect(scheme.frames.every(({ colors }) => colors.length === 16)).toBe(true);
      expect(decodeScheme(encodeScheme(scheme))).toEqual(scheme);
    },
  );

  it('finds preset by uid', () => {
    const [first] = SCHEME_PRESETS;

    expect(getSchemePreset(first?.uid ?? '')).toBe(first);
    expect(getSchemePreset('missing')).toBeUndefined();
  });
});
