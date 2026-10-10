import {
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
  LIGHTS_BACKGROUND_COLOR,
  LIGHTS_PALLETTE_HUE_MASK,
  LIGHTS_PALLETTE_HUE_MAX,
  LIGHTS_PALLETTE_LIGHTNESS_BASE,
  LIGHTS_PALLETTE_LIGHTNESS_MASK,
  LIGHTS_PALLETTE_LIGHTNESS_STEP,
} from '../../lib/lights/lights.config';
import type { LightColor, LightsFrame, LightsScheme } from '../../lib/lights/lights.types';
import { secureRandomNumber } from '../../lib/utils/uid/uid';
import { EDITOR_LIGHTS_COUNT_MAX, EDITOR_LIGHTS_COUNT_MIN, EDITOR_RECENT_COLORS_COUNT } from './editor.config';
import type { GridCell, SchemeShiftDirection } from './editor.types';

const resolveColorHue = (color: number): number => ((color & LIGHTS_PALLETTE_HUE_MASK) * 360) / LIGHTS_PALLETTE_HUE_MAX;

const isWhiteColor = (color: number): boolean => color % LIGHTS_PALLETTE_HUE_MAX === LIGHTS_PALLETTE_HUE_MASK;

const resolveColorValue = (color: number): number =>
  color === LIGHTS_PALLETTE_HUE_MASK
    ? 0
    : ((color & LIGHTS_PALLETTE_LIGHTNESS_MASK) >> 6) * LIGHTS_PALLETTE_LIGHTNESS_STEP + LIGHTS_PALLETTE_LIGHTNESS_BASE;

export const resolveBinaryColorStyle = (color: LightColor): string => {
  const hue = resolveColorHue(color);
  const value = resolveColorValue(color);

  return isWhiteColor(color) ? `hsl(${hue}deg 0% ${value}%)` : `hsl(${hue}deg 100% ${value / 2}%)`;
};

const rotate = <T>(items: T[], delta: number): T[] => {
  const length = items.length;
  if (length === 0) return items;
  const split = length - (((delta % length) + length) % length);
  return [...items.slice(split), ...items.slice(0, split)];
};

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const target = secureRandomNumber(index + 1);
    const current = result[index] as T;
    result[index] = result[target] as T;
    result[target] = current;
  }
  return result;
};

const resizeColors = (colors: LightColor[], length: number): LightColor[] =>
  Array.from({ length }, (_, index) => colors[index] ?? LIGHTS_BACKGROUND_COLOR);

const createFrame = (lightsCount: number): LightsFrame => ({
  type: DEFAULT_LIGHTS_FRAME_TYPE,
  tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
  colors: resizeColors([], lightsCount),
});

const withFrames = (scheme: LightsScheme, frames: LightsFrame[]): LightsScheme => ({ ...scheme, frames });

const updateFrame = (scheme: LightsScheme, row: number, update: (frame: LightsFrame) => LightsFrame): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame, index) => (index === row ? update(frame) : frame)),
  );

const shiftColumns = (scheme: LightsScheme, delta: number): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame) => ({ ...frame, colors: rotate(frame.colors, delta) })),
  );

export const getLightsCount = (scheme: LightsScheme): number => scheme.frames[0]?.colors.length ?? 0;

export const clampLightsCount = (value: number): number =>
  Math.min(EDITOR_LIGHTS_COUNT_MAX, Math.max(EDITOR_LIGHTS_COUNT_MIN, Math.trunc(value)));

export const resizeScheme = (scheme: LightsScheme, lightsCount: number): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame) => ({ ...frame, colors: resizeColors(frame.colors, lightsCount) })),
  );

export const normalizeScheme = (scheme: LightsScheme): LightsScheme => {
  const lightsCount = clampLightsCount(getLightsCount(scheme));
  const frames = scheme.frames.length > 0 ? scheme.frames : [createFrame(lightsCount)];
  return resizeScheme(withFrames(scheme, frames), lightsCount);
};

export const paintCells = (scheme: LightsScheme, cells: GridCell[], color: LightColor): LightsScheme =>
  withFrames(
    scheme,
    scheme.frames.map((frame, row) => {
      const columns = new Set(cells.filter((cell) => cell.row === row).map((cell) => cell.column));
      if (columns.size === 0) return frame;
      return { ...frame, colors: frame.colors.map((current, column) => (columns.has(column) ? color : current)) };
    }),
  );

export const updateRow = (
  scheme: LightsScheme,
  row: number,
  patch: Partial<Pick<LightsFrame, 'type' | 'tempo'>>,
): LightsScheme => updateFrame(scheme, row, (frame) => ({ ...frame, ...patch }));

export const addRow = (scheme: LightsScheme, afterRow: number): LightsScheme =>
  withFrames(scheme, scheme.frames.toSpliced(afterRow + 1, 0, createFrame(getLightsCount(scheme))));

export const cloneRow = (scheme: LightsScheme, row: number): LightsScheme => {
  const frame = scheme.frames[row];
  return frame ? withFrames(scheme, scheme.frames.toSpliced(row + 1, 0, structuredClone(frame))) : scheme;
};

export const deleteRow = (scheme: LightsScheme, row: number): LightsScheme =>
  scheme.frames.length > 1 ? withFrames(scheme, scheme.frames.toSpliced(row, 1)) : scheme;

export const moveRow = (scheme: LightsScheme, from: number, to: number): LightsScheme => {
  const frame = scheme.frames[from];
  return frame ? withFrames(scheme, scheme.frames.toSpliced(from, 1).toSpliced(to, 0, frame)) : scheme;
};

export const shiftRow = (scheme: LightsScheme, row: number, delta: number): LightsScheme =>
  updateFrame(scheme, row, (frame) => ({ ...frame, colors: rotate(frame.colors, delta) }));

export const shuffleRow = (scheme: LightsScheme, row: number): LightsScheme =>
  updateFrame(scheme, row, (frame) => ({ ...frame, colors: shuffle(frame.colors) }));

export const shiftScheme = (scheme: LightsScheme, direction: SchemeShiftDirection): LightsScheme => {
  if (direction === 'up') return withFrames(scheme, rotate(scheme.frames, -1));
  if (direction === 'down') return withFrames(scheme, rotate(scheme.frames, 1));
  return shiftColumns(scheme, direction === 'left' ? -1 : 1);
};

export const pushRecentColor = (recent: LightColor[], previous: LightColor, next: LightColor): LightColor[] =>
  previous === next
    ? recent
    : [previous, ...recent.filter((color) => color !== previous && color !== next)].slice(
        0,
        EDITOR_RECENT_COLORS_COUNT,
      );
