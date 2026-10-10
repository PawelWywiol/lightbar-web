import { describe, expect, it } from 'vitest';
import { LIGHTS_BACKGROUND_COLOR, LIGHTS_SCHEME_NAME_MAX_LENGTH } from '../lights/lights.config';
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

  it('sparkles lights one random light per frame without repeating position in a row', () => {
    const frames = getSchemePreset('preset-sparkles')?.scheme.frames ?? [];
    const positions = frames.map(({ colors }) => colors.findIndex((value) => value === 255));

    expect(frames.every(({ colors }) => colors.filter((value) => value === 255).length === 1)).toBe(true);
    expect(positions.every((position, index) => index === 0 || position !== positions[index - 1])).toBe(true);
    expect(new Set(positions).size).toBeGreaterThanOrEqual(8);
  });

  it('fire mixes several colors in every frame', () => {
    const frames = getSchemePreset('preset-fire')?.scheme.frames ?? [];

    expect(frames.every(({ colors }) => new Set(colors).size >= 3 && !colors.includes(LIGHTS_BACKGROUND_COLOR))).toBe(
      true,
    );
  });
});
