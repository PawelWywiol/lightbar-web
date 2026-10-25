import { describe, expect, it } from 'vitest';
import type { LightsFrame } from './lights.types';
import {
  addHueOffset,
  addPixelOffset,
  clampPixelShift,
  createLightColor,
  createPixelShiftOptions,
  resolveSchemeHueOffsets,
  resolveSchemePeriod,
  resolveSchemePixelOffsets,
  rotateColors,
  shiftColorHue,
} from './lights.config';

const frame = (hueShift: number, pixelShift = 0, size = 0): LightsFrame => ({
  type: 0,
  shuffle: false,
  hueShift,
  pixelShift,
  tempo: 60,
  colors: Array.from({ length: size }, () => createLightColor(0)),
});

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

describe('addPixelOffset', () => {
  it('wraps offset within frame lights count', () => {
    expect(addPixelOffset(0, -2, 16)).toBe(14);
    expect(addPixelOffset(15, 1, 16)).toBe(0);
    expect(addPixelOffset(0, -128, 200)).toBe(72);
    expect(addPixelOffset(0, 5, 1)).toBe(0);
  });
});

describe('rotateColors', () => {
  it('moves colors towards higher indexes and wraps the last ones to the start', () => {
    const colors = [1, 2, 3, 4].map((index) => createLightColor(index));
    expect(rotateColors(colors, 1)).toEqual([4, 1, 2, 3]);
    expect(rotateColors(colors, 2)).toEqual([3, 4, 1, 2]);
    expect(rotateColors(colors, 0)).toEqual([1, 2, 3, 4]);
  });
});

describe('resolveSchemePixelOffsets', () => {
  it('accumulates pixel shifts up to and including each frame', () => {
    expect(resolveSchemePixelOffsets([frame(0, 1, 4), frame(0, 0, 4), frame(0, -3, 4)])).toEqual([1, 1, 2]);
  });
});

const pixelShiftValues = (count: number) => createPixelShiftOptions(count, 'No move').map(({ value }) => Number(value));

describe('pixel shift range', () => {
  it('limits options to lights count minus one and signed byte', () => {
    expect(pixelShiftValues(1)).toEqual([0]);
    expect(pixelShiftValues(3)).toEqual([-2, -1, 0, 1, 2]);
    expect(pixelShiftValues(200).at(0)).toBe(-128);
    expect(pixelShiftValues(200).at(-1)).toBe(127);
    expect(createPixelShiftOptions(3, 'No move').find(({ value }) => value === '0')?.label).toBe('No move');
  });

  it('clamps pixel shift to the lights count range', () => {
    expect(clampPixelShift(-5, 3)).toBe(-2);
    expect(clampPixelShift(5, 3)).toBe(2);
    expect(clampPixelShift(-200, 255)).toBe(-128);
    expect(clampPixelShift(200, 255)).toBe(127);
    expect(clampPixelShift(4, 1)).toBe(0);
  });
});

const colorsFrame = (indexes: number[], shuffle = false): LightsFrame => ({
  ...frame(0),
  shuffle,
  colors: indexes.map((index) => createLightColor(index)),
});

describe('resolveSchemePeriod', () => {
  it('returns 1 for uniform frames', () => {
    expect(resolveSchemePeriod([colorsFrame([5, 5, 5, 5]), colorsFrame([7, 7])])).toBe(1);
  });

  it('returns the smallest repeating pattern length shared by all frames', () => {
    expect(resolveSchemePeriod([colorsFrame([1, 2, 1, 2, 1, 2])])).toBe(2);
    expect(resolveSchemePeriod([colorsFrame([1, 2, 1, 2, 1, 2]), colorsFrame([1, 2, 3, 1, 2, 3])])).toBe(6);
    expect(resolveSchemePeriod([colorsFrame([1, 2, 3, 4])])).toBe(4);
  });

  it('ignores shuffled frames', () => {
    expect(resolveSchemePeriod([colorsFrame([1, 2, 3, 4], true)])).toBe(1);
  });
});
