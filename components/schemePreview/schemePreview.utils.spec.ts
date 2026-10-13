import { describe, expect, it } from 'vitest';
import { createLightColor } from '../../lib/lights/lights.config';
import type { LightsFrame } from '../../lib/lights/lights.types';
import {
  advancePosition,
  findChangedFrame,
  resolveFrameColors,
  resolveFrameDuration,
  resolvePreviewState,
} from './schemePreview.utils';

const frame = (tempo: number, type: LightsFrame['type'] = 0): LightsFrame => ({
  type,
  shuffle: false,
  hueShift: 0,
  pixelShift: 0,
  tempo,
  colors: [createLightColor(1)],
});

describe('resolveFrameDuration', () => {
  it('converts tempo to milliseconds', () => {
    expect(resolveFrameDuration(frame(60))).toBe(1000);
    expect(resolveFrameDuration(frame(240))).toBe(250);
  });

  it('treats zero tempo as one per minute', () => {
    expect(resolveFrameDuration(frame(0))).toBe(60000);
  });

  it('rounds to whole 60 fps ticks like firmware', () => {
    expect(resolveFrameDuration(frame(32))).toBeCloseTo((113 / 60) * 1000);
  });

  it('maps tempo above 240 to fast tick counts with 255 reserved as one tick', () => {
    expect(resolveFrameDuration(frame(241))).toBeCloseTo((14 / 60) * 1000);
    expect(resolveFrameDuration(frame(249))).toBe(100);
    expect(resolveFrameDuration(frame(254))).toBeCloseTo(1000 / 60);
    expect(resolveFrameDuration(frame(255))).toBeCloseTo(1000 / 60);
  });
});

describe('findChangedFrame', () => {
  it('returns first replaced frame index', () => {
    const frames = [frame(60), frame(60), frame(60)];
    expect(findChangedFrame(frames, frames.with(1, frame(120)))).toBe(1);
  });

  it('returns index of inserted frame', () => {
    const frames = [frame(60), frame(60)];
    expect(findChangedFrame(frames, frames.toSpliced(1, 0, frame(120)))).toBe(1);
  });

  it('returns 0 when nothing changed or only trailing frames removed', () => {
    const frames = [frame(60), frame(60)];
    expect(findChangedFrame(frames, frames)).toBe(0);
    expect(findChangedFrame(frames, frames.slice(0, 1))).toBe(0);
  });
});

describe('advancePosition', () => {
  const frames = [frame(60), frame(120), frame(240)];

  it('stays on frame within its duration', () => {
    expect(advancePosition(frames, { index: 0, elapsed: 999 })).toEqual({ index: 0, elapsed: 999 });
  });

  it('moves to next frames by their durations', () => {
    expect(advancePosition(frames, { index: 0, elapsed: 1600 })).toEqual({ index: 2, elapsed: 100 });
  });

  it('loops back to first frame', () => {
    expect(advancePosition(frames, { index: 2, elapsed: 300 })).toEqual({ index: 0, elapsed: 50 });
  });
});

describe('resolvePreviewState', () => {
  it('has no progress for step frame', () => {
    const frames = [frame(60), frame(60)];
    expect(resolvePreviewState(frames, { index: 0, elapsed: 500 })).toEqual({
      current: frames[0],
      next: frames[1],
      progress: 0,
    });
  });

  it('fades towards next frame, wrapping to first', () => {
    const frames = [frame(60), frame(60, 1)];
    expect(resolvePreviewState(frames, { index: 1, elapsed: 250 })).toEqual({
      current: frames[1],
      next: frames[0],
      progress: 0.25,
    });
  });
});

describe('resolveFrameColors', () => {
  const colors = [1, 2, 3, 4, 5, 6, 7, 8].map((index) => createLightColor(index));

  it('keeps colors order without shuffle', () => {
    expect(resolveFrameColors({ ...frame(60), colors })).toBe(colors);
  });

  it('returns a permutation of colors with shuffle', () => {
    const shuffled = resolveFrameColors({ ...frame(60), shuffle: true, colors });
    expect(shuffled).not.toBe(colors);
    expect(shuffled.toSorted((a, b) => a - b)).toEqual(colors);
  });
});

describe('resolveFrameColors with hue offset', () => {
  it('shifts colors by offset', () => {
    const colors = [0, 32, 63].map((index) => createLightColor(index));
    expect(resolveFrameColors({ ...frame(60), colors }, 8)).toEqual([8, 40, 63]);
  });
});

describe('resolveFrameColors with pixel offset', () => {
  it('rotates colors before shifting hue', () => {
    const colors = [0, 32, 63].map((index) => createLightColor(index));
    expect(resolveFrameColors({ ...frame(60), colors }, 8, 1)).toEqual([63, 8, 40]);
  });
});
