import { BlendIcon, DicesIcon } from 'lucide-react';
import { useMessages } from '../../../lib/i18n/i18n';
import {
  createHueShiftOptions,
  createPixelShiftOptions,
  LIGHTS_FRAME_TEMPO_OPTIONS,
} from '../../../lib/lights/lights.config';
import { lightsFrameType } from '../../../lib/lights/lights.types';
import { SelectWrapper } from '../../../lib/ui/select/select';
import { getLightsCount, updateRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';
import { EditorToolButton } from './editorToolButton';

export const EditorRowTools = () => {
  const messages = useMessages();
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow } = useEditorGrid();
  const { scheme } = lightsScheme;
  const frame = scheme.frames[activeRow];

  if (!frame) return null;

  const isFade = frame.type === lightsFrameType.fade;

  return (
    <>
      <EditorToolButton
        tooltip={messages.editor.tooltip.frameFade}
        icon={<BlendIcon />}
        label={messages.editor.short.frameFade}
        aria-label={messages.editor.frameFade}
        aria-pressed={isFade}
        onClick={() =>
          handleUpdate(updateRow(scheme, activeRow, { type: isFade ? lightsFrameType.step : lightsFrameType.fade }))
        }
      />
      <EditorToolButton
        tooltip={messages.editor.tooltip.frameShuffle}
        icon={<DicesIcon />}
        label={messages.editor.short.frameShuffle}
        aria-label={messages.editor.frameShuffle}
        aria-pressed={frame.shuffle}
        onClick={() => handleUpdate(updateRow(scheme, activeRow, { shuffle: !frame.shuffle }))}
      />
      <div className="col-span-5 flex gap-1.5">
        <div className="min-w-0 flex-1">
          <SelectWrapper
            ariaLabel={messages.editor.frameTempo}
            tooltip={messages.editor.tooltip.frameTempo}
            options={LIGHTS_FRAME_TEMPO_OPTIONS}
            value={`${frame.tempo}`}
            onChange={(value) => {
              const tempo = Number.parseInt(value, 10);
              if (tempo) handleUpdate(updateRow(scheme, activeRow, { tempo }));
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <SelectWrapper
            ariaLabel={messages.editor.frameHueShift}
            tooltip={messages.editor.tooltip.frameHueShift}
            options={createHueShiftOptions(messages.editor.noHueShift)}
            value={`${frame.hueShift}`}
            onChange={(value) => handleUpdate(updateRow(scheme, activeRow, { hueShift: Number.parseInt(value, 10) }))}
          />
        </div>
        <div className="min-w-0 flex-1">
          <SelectWrapper
            ariaLabel={messages.editor.framePixelShift}
            tooltip={messages.editor.tooltip.framePixelShift}
            options={createPixelShiftOptions(getLightsCount(scheme), messages.editor.noPixelShift)}
            value={`${frame.pixelShift}`}
            onChange={(value) => handleUpdate(updateRow(scheme, activeRow, { pixelShift: Number.parseInt(value, 10) }))}
          />
        </div>
      </div>
    </>
  );
};
