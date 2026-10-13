import { useEffect, useRef } from 'react';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsFrame } from '../../lib/lights/lights.types';
import { resolveBinaryColorStyle } from '../editor/editor.utils';
import type { PreviewPosition } from './schemePreview.utils';
import {
  addHueOffset,
  addPixelOffset,
  resolveSchemeHueOffsets,
  resolveSchemePixelOffsets,
} from '../../lib/lights/lights.config';
import { advancePosition, findChangedFrame, resolveFrameColors, resolvePreviewState } from './schemePreview.utils';

interface SchemePreviewProps {
  frames: LightsFrame[];
}

const drawColors = (context: CanvasRenderingContext2D, colors: LightColor[], alpha: number) => {
  context.globalAlpha = alpha;
  colors.forEach((color, index) => {
    context.fillStyle = resolveBinaryColorStyle(color);
    context.fillRect(index, 0, 1, 1);
  });
};

export const SchemePreview = ({ frames }: SchemePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousFramesRef = useRef(frames);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context || frames.length === 0) return;

    let position: PreviewPosition = { index: findChangedFrame(previousFramesRef.current, frames), elapsed: 0 };
    let last = performance.now();
    let rafId = 0;
    previousFramesRef.current = frames;
    const frameAt = (index: number) => frames[index % frames.length] as LightsFrame;
    const addOffsets = (offsets: { hue: number; pixel: number }, frame: LightsFrame) => ({
      hue: addHueOffset(offsets.hue, frame.hueShift),
      pixel: addPixelOffset(offsets.pixel, frame.pixelShift, frame.colors.length),
    });
    const resolveColors = (index: number, offsets: { hue: number; pixel: number }) =>
      resolveFrameColors(frameAt(index), offsets.hue, offsets.pixel);
    const resolveNextColors = (index: number, offsets: { hue: number; pixel: number }) =>
      resolveColors(index + 1, addOffsets(offsets, frameAt(index + 1)));
    let offsets = {
      hue: resolveSchemeHueOffsets(frames)[position.index] ?? 0,
      pixel: resolveSchemePixelOffsets(frames)[position.index] ?? 0,
    };
    let currentColors = resolveColors(position.index, offsets);
    let nextColors = resolveNextColors(position.index, offsets);

    const draw = (now: number) => {
      const previous = position;
      position = advancePosition(frames, { index: previous.index, elapsed: previous.elapsed + now - last });
      last = now;
      if (position.index !== previous.index || position.elapsed < previous.elapsed) {
        offsets = addOffsets(offsets, frameAt(position.index));
        currentColors =
          position.index === (previous.index + 1) % frames.length ? nextColors : resolveColors(position.index, offsets);
        nextColors = resolveNextColors(position.index, offsets);
      }
      const { progress } = resolvePreviewState(frames, position);
      drawColors(context, currentColors, 1);
      if (progress > 0) drawColors(context, nextColors, progress);
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [frames]);

  return (
    <div className="w-full rounded-md border bg-background p-2">
      <canvas
        ref={canvasRef}
        width={frames[0]?.colors.length ?? 0}
        height={1}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- canvas has no semantic equivalent
        role="img"
        aria-label={MESSAGES.scheme.preview}
        className="block w-full h-2 rounded-lg [image-rendering:pixelated]"
      />
    </div>
  );
};
