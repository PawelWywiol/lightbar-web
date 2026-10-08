import { lightsFrameType } from '../../lib/lights/lights.types';
import type { LightsFrame } from '../../lib/lights/lights.types';
import { resolveFrameSeconds } from '../../lib/lights/lights.config';

export interface PreviewPosition {
  index: number;
  elapsed: number;
}

export interface PreviewState {
  current: LightsFrame;
  next: LightsFrame;
  progress: number;
}

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
