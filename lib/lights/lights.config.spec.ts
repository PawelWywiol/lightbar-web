import { describe, expect, it } from 'vitest';
import type { LightsFrame } from './lights.types';
import { addHueOffset, createLightColor, resolveSchemeHueOffsets, shiftColorHue } from './lights.config';

const frame = (hueShift: number): LightsFrame => ({ type: 0, shuffle: false, hueShift, tempo: 60, colors: [] });

describe('addHueOffset', () => {
  it('wraps offset within 63 chromatic hues', () => {
    expect(addHueOffset(0, -1)).toBe(62);
    expect(addHueOffset(62, 1)).toBe(0);
    expect(addHueOffset(0, -32)).toBe(31);
    expect(addHueOffset(10, 31)).toBe(41);
  });
});

describe('shiftColorHue', () => {
  it('shifts hue within 63 chromatic hues and keeps lightness', () => {
    expect(shiftColorHue(createLightColor(0), 8)).toBe(8);
    expect(shiftColorHue(createLightColor(32), 55)).toBe(24);
    expect(shiftColorHue(createLightColor(62), 1)).toBe(0);
    expect(shiftColorHue(createLightColor(0x80), 62)).toBe(0x80 + 62);
  });

  it('keeps white and black untouched', () => {
    expect(shiftColorHue(createLightColor(63), 5)).toBe(63);
    expect(shiftColorHue(createLightColor(0xbf), 5)).toBe(0xbf);
  });
});

describe('resolveSchemeHueOffsets', () => {
  it('accumulates shifts up to and including each frame for the first loop', () => {
    expect(resolveSchemeHueOffsets([frame(8), frame(0), frame(-1), frame(5)])).toEqual([8, 8, 7, 12]);
  });

  it('wraps accumulated offset within 63 chromatic hues', () => {
    expect(resolveSchemeHueOffsets([frame(31), frame(31), frame(31)])).toEqual([31, 62, 30]);
    expect(resolveSchemeHueOffsets([frame(-1), frame(0)])).toEqual([62, 62]);
  });
});
