import { useEffect, useRef, useState } from 'react';
import { useMessages } from '../../lib/i18n/i18n';
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
  pitch: number;
}

const drawColors = (context: CanvasRenderingContext2D, colors: LightColor[], alpha: number, count: number) => {
  context.globalAlpha = alpha;
  for (let index = 0; index < count; index++) {
    context.fillStyle = resolveBinaryColorStyle(colors[index % colors.length] as LightColor);
    context.fillRect(index, 0, 1, 1);
  }
};

const useDotsCount = (pitch: number) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = () => setCount(Math.max(1, Math.floor(wrapper.clientWidth / pitch)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [pitch]);

  return { wrapperRef, count };
};

export const SchemePreview = ({ frames, pitch }: SchemePreviewProps) => {
  const messages = useMessages();
  const { wrapperRef, count } = useDotsCount(pitch);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const previousFramesRef = useRef(frames);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || frames.length === 0) return;
    const glowContext = glowRef.current?.getContext('2d');

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
      drawColors(context, currentColors, 1, count);
      if (progress > 0) drawColors(context, nextColors, progress, count);
      glowContext?.drawImage(canvas, 0, 0);
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [frames, count]);

  const dotsStyle = {
    width: `${count * pitch}px`,
    height: `${pitch}px`,
    maskImage: 'radial-gradient(circle closest-side, #000 76%, transparent 80%)',
    maskSize: `${pitch}px 100%`,
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div aria-hidden="true" className="absolute inset-0 blur-[6px] brightness-200 saturate-150">
        <canvas
          ref={glowRef}
          width={count}
          height={1}
          style={{ ...dotsStyle, maskImage: 'radial-gradient(circle closest-side, #000 100%, transparent)' }}
          className="mx-auto block [image-rendering:pixelated]"
        />
      </div>
      <canvas
        ref={canvasRef}
        width={count}
        height={1}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- canvas has no semantic equivalent
        role="img"
        aria-label={messages.scheme.preview}
        style={dotsStyle}
        className="relative mx-auto block [image-rendering:pixelated]"
      />
    </div>
  );
};
