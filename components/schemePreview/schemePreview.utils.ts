import { lightsFrameType } from '../../lib/lights/lights.types';
import type { LightColor, LightsFrame } from '../../lib/lights/lights.types';
import { shuffle } from '../editor/editor.utils';
import {
  LIGHTS_PALLETTE_CHROMATIC_HUES,
  LIGHTS_PALLETTE_HUE_MASK,
  LIGHTS_PALLETTE_LIGHTNESS_MASK,
  resolveFrameSeconds,
} from '../../lib/lights/lights.config';

export interface PreviewPosition {
  index: number;
  elapsed: number;
}

export interface PreviewState {
  current: LightsFrame;
  next: LightsFrame;
  progress: number;
}

export const addHueOffset = (hueOffset: number, hueShift: number): number =>
  (((hueOffset + hueShift) % LIGHTS_PALLETTE_CHROMATIC_HUES) + LIGHTS_PALLETTE_CHROMATIC_HUES) %
  LIGHTS_PALLETTE_CHROMATIC_HUES;

export const shiftColorHue = (color: LightColor, hueOffset: number): LightColor => {
  const hue = color & LIGHTS_PALLETTE_HUE_MASK;
  if (hue === LIGHTS_PALLETTE_HUE_MASK) return color;
  return ((color & LIGHTS_PALLETTE_LIGHTNESS_MASK) | addHueOffset(hue, hueOffset)) as LightColor;
};

export const resolveFrameColors = (frame: LightsFrame, hueOffset = 0): LightColor[] => {
  const colors = hueOffset ? frame.colors.map((color) => shiftColorHue(color, hueOffset)) : frame.colors;
  return frame.shuffle ? shuffle(colors) : colors;
};

export const resolveFrameDuration = (frame: LightsFrame): number => resolveFrameSeconds(frame.tempo) * 1000;

export const findChangedFrame = (previous: LightsFrame[], next: LightsFrame[]): number =>
  Math.max(
    0,
    next.findIndex((frame, index) => frame !== previous[index]),
  );

export const advancePosition = (frames: LightsFrame[], position: PreviewPosition): PreviewPosition => {
  let { index, elapsed } = position;
  let duration = resolveFrameDuration(frames[index] as LightsFrame);
  while (elapsed >= duration) {
    elapsed -= duration;
    index = (index + 1) % frames.length;
    duration = resolveFrameDuration(frames[index] as LightsFrame);
  }
  return { index, elapsed };
};

export const resolvePreviewState = (frames: LightsFrame[], position: PreviewPosition): PreviewState => {
  const current = frames[position.index] as LightsFrame;
  const next = frames[(position.index + 1) % frames.length] as LightsFrame;
  const progress =
    current.type === lightsFrameType.fade ? Math.min(1, position.elapsed / resolveFrameDuration(current)) : 0;
  return { current, next, progress };
};
