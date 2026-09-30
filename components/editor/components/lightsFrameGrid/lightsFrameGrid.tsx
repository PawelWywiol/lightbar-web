import { useCallback, useMemo, useRef } from 'react';
import {
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
  LIGHTS_BACKGROUND_COLOR,
} from '../../../../lib/lights/lights.config';
import type { LightsFrame } from '../../../../lib/lights/lights.types';
import { useEditor } from '../../editor.provider';
import { resolveBinaryColorStyle } from '../../editor.utils';
import { useGridPainter } from './lightsFrameGrid.hooks';

export const LightsFrameGrid = () => {
  const { lightsScheme, lightsLayout, frameIndex, color, handleUpdate } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const currentFrame = lightsScheme.scheme.frames[frameIndex];

  const handleColorUpdate = useCallback(
    (updatedColorIndexes: number[]) => {
      const updatedFrame: LightsFrame = {
        ...currentFrame,
        type: currentFrame?.type ?? DEFAULT_LIGHTS_FRAME_TYPE,
        tempo: currentFrame?.tempo ?? DEFAULT_LIGHTS_FRAME_TEMPO,
        colors: Array.from({
          length: lightsLayout.value,
        }).map((_, index) => {
          return updatedColorIndexes.includes(index)
            ? color
            : (currentFrame?.colors[index] ?? LIGHTS_BACKGROUND_COLOR);
        }),
      };

      handleUpdate({
        ...lightsScheme.scheme,
        frames: lightsScheme.scheme.frames.map((frame, index) =>
          index === frameIndex ? updatedFrame : frame,
        ),
      });
    },
    [currentFrame, lightsLayout.value, color, handleUpdate, lightsScheme.scheme, frameIndex],
  );

  const pixelIndexes = useMemo(
    () => Array.from({ length: lightsLayout.value }, (_, i) => i),
    [lightsLayout.value],
  );

  useGridPainter(ref, resolveBinaryColorStyle(color), handleColorUpdate);

  return (
    currentFrame && (
      <div
        ref={ref}
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${lightsLayout.grid.columns},minmax(0,1fr))`,
        }}
      >
        {pixelIndexes.map((index) => {
          const binaryColorStyle = resolveBinaryColorStyle(
            currentFrame.colors[index] ?? LIGHTS_BACKGROUND_COLOR,
          );
          return (
            <div
              key={`pixel-${index}`}
              className="w-full h-full rounded aspect-square"
              style={{ background: binaryColorStyle }}
            />
          );
        })}
      </div>
    )
  );
};
