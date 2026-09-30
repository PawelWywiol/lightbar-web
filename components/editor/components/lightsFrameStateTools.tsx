import { CopyPlus, StepBack, StepForward } from 'lucide-react';
import { LIGHTS_FRAME_TEMPO_OPTIONS, LIGHTS_FRAME_TYPES } from '../../../lib/lights/lights.config';
import type { LightsScheme } from '../../../lib/lights/lights.types';
import { Button } from '../../../lib/ui/button/button';
import { DropDownMenuWrapper } from '../../../lib/ui/dropdownMenu/dropdownMenu';
import { SelectWrapper } from '../../../lib/ui/select/select';
import { useFrameUpdater } from '../editor.hooks';
import { useEditor } from '../editor.provider';
import { ColorPickerTools } from './colorPickerTools';

export const LightsFrameStateTools = () => {
  const {
    lightsScheme,
    frameIndex,
    framesCount,
    nextFrame,
    nextFrameAvailable,
    previousFrame,
    previousFrameAvailable,
    handleUpdate,
  } = useEditor();
  const updateFrame = useFrameUpdater();
  const frame = lightsScheme.scheme.frames[frameIndex];

  if (!frame) {
    return null;
  }

  return (
    <div className="flex justify-between content-center flex-wrap gap-2">
      <div className="flex gap-2 flex-grow">
        <SelectWrapper
          options={LIGHTS_FRAME_TYPES.map((option) => ({
            value: `${option.value}`,
            label: option.label,
          }))}
          value={`${frame.type}`}
          onChange={(value) => {
            const type = LIGHTS_FRAME_TYPES.find((option) => `${option.value}` === value);
            if (!type) return;
            updateFrame((f) => {
              f.type = type.value;
            });
          }}
        />
        <SelectWrapper
          options={LIGHTS_FRAME_TEMPO_OPTIONS}
          value={`${frame.tempo}`}
          onChange={(value) => {
            const tempo = Number.parseInt(value, 10);
            if (!tempo) return;
            updateFrame((f) => {
              f.tempo = tempo;
            });
          }}
        />
        <ColorPickerTools />
      </div>
      <div className="flex gap-2 flex-grow">
        <Button disabled={!previousFrameAvailable} onClick={previousFrame}>
          <StepBack />
        </Button>
        <DropDownMenuWrapper
          trigger={
            <Button className="flex flex-1 gap-2 text-muted-foreground text-xs" asChild>
              <span>
                <span>{`${frameIndex + 1} : ${framesCount}`}</span>

                <CopyPlus />
              </span>
            </Button>
          }
          options={[
            {
              label: 'Copy',
              onClick: () => {
                const newFrame = structuredClone(frame);
                const updatedScheme: LightsScheme = { ...lightsScheme.scheme };
                updatedScheme.frames.splice(frameIndex, 0, newFrame);
                handleUpdate(updatedScheme);
                nextFrame();
              },
            },
            {
              label: 'Delete',
              onClick: () => {
                if (lightsScheme.scheme.frames.length === 1) {
                  return;
                }

                const updatedScheme: LightsScheme = { ...lightsScheme.scheme };
                updatedScheme.frames.splice(frameIndex, 1);
                handleUpdate(updatedScheme);
                previousFrame();
              },
            },
          ]}
        />
        <Button disabled={!nextFrameAvailable} onClick={nextFrame}>
          <StepForward />
        </Button>
      </div>
    </div>
  );
};
