import { useEffect, useRef } from 'react';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsFrame } from '../../lib/lights/lights.types';
import { resolveBinaryColorStyle } from '../editor/editor.utils';
import type { PreviewPosition } from './schemePreview.utils';
import { advancePosition, findChangedFrame, resolvePreviewState } from './schemePreview.utils';

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

    const draw = (now: number) => {
      position = advancePosition(frames, { index: position.index, elapsed: position.elapsed + now - last });
      last = now;
      const { current, next, progress } = resolvePreviewState(frames, position);
      drawColors(context, current.colors, 1);
      if (progress > 0) drawColors(context, next.colors, progress);
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
