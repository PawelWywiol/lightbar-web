import { BlendIcon, DicesIcon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import {
  createPixelShiftOptions,
  LIGHTS_FRAME_HUE_SHIFT_OPTIONS,
  LIGHTS_FRAME_TEMPO_OPTIONS,
} from '../../../lib/lights/lights.config';
import { lightsFrameType } from '../../../lib/lights/lights.types';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { SelectWrapper } from '../../../lib/ui/select/select';
import { getLightsCount, updateRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

export const EditorRowTools = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow } = useEditorGrid();
  const { scheme } = lightsScheme;
  const frame = scheme.frames[activeRow];

  if (!frame) return null;

  const isFade = frame.type === lightsFrameType.fade;

  return (
    <div className="flex flex-wrap gap-2">
      <Tooltip content={MESSAGES.editor.tooltip.frameFade}>
        <Button
          aria-label={MESSAGES.editor.frameFade}
          aria-pressed={isFade}
          className="shrink-0"
          onClick={() =>
            handleUpdate(updateRow(scheme, activeRow, { type: isFade ? lightsFrameType.step : lightsFrameType.fade }))
          }
        >
          <BlendIcon />
        </Button>
      </Tooltip>
      <Tooltip content={MESSAGES.editor.tooltip.frameShuffle}>
        <Button
          aria-label={MESSAGES.editor.frameShuffle}
          aria-pressed={frame.shuffle}
          className="shrink-0"
          onClick={() => handleUpdate(updateRow(scheme, activeRow, { shuffle: !frame.shuffle }))}
        >
          <DicesIcon />
        </Button>
      </Tooltip>
      <div className="flex-1 min-w-22">
        <SelectWrapper
          ariaLabel={MESSAGES.editor.frameTempo}
          tooltip={MESSAGES.editor.tooltip.frameTempo}
          options={LIGHTS_FRAME_TEMPO_OPTIONS}
          value={`${frame.tempo}`}
          onChange={(value) => {
            const tempo = Number.parseInt(value, 10);
            if (tempo) handleUpdate(updateRow(scheme, activeRow, { tempo }));
          }}
        />
      </div>
      <div className="flex-1 min-w-22">
        <SelectWrapper
          ariaLabel={MESSAGES.editor.frameHueShift}
          tooltip={MESSAGES.editor.tooltip.frameHueShift}
          options={LIGHTS_FRAME_HUE_SHIFT_OPTIONS}
          value={`${frame.hueShift}`}
          onChange={(value) => handleUpdate(updateRow(scheme, activeRow, { hueShift: Number.parseInt(value, 10) }))}
        />
      </div>
      <div className="flex-1 min-w-22">
        <SelectWrapper
          ariaLabel={MESSAGES.editor.framePixelShift}
          tooltip={MESSAGES.editor.tooltip.framePixelShift}
          options={createPixelShiftOptions(getLightsCount(scheme))}
          value={`${frame.pixelShift}`}
          onChange={(value) => handleUpdate(updateRow(scheme, activeRow, { pixelShift: Number.parseInt(value, 10) }))}
        />
      </div>
    </div>
  );
};
