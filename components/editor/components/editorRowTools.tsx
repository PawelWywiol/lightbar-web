import { CopyPlusIcon, ListPlusIcon, Trash2Icon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { LIGHTS_FRAME_TEMPO_OPTIONS, LIGHTS_FRAME_TYPES } from '../../../lib/lights/lights.config';
import { Button } from '../../../lib/ui/button/button';
import { SelectWrapper } from '../../../lib/ui/select/select';
import { EDITOR_ROWS_MAX } from '../editor.config';
import { addRow, cloneRow, deleteRow, updateRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

export const EditorRowTools = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow, setActiveRow, setPreviewRow } = useEditorGrid();
  const { scheme } = lightsScheme;
  const frame = scheme.frames[activeRow];

  if (!frame) return null;

  const rowsCount = scheme.frames.length;
  const selectRow = (row: number) => {
    setActiveRow(row);
    setPreviewRow(row);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0">
        <SelectWrapper
          options={LIGHTS_FRAME_TYPES.map((option) => ({ value: `${option.value}`, label: option.label }))}
          value={`${frame.type}`}
          onChange={(value) => {
            const type = LIGHTS_FRAME_TYPES.find((option) => `${option.value}` === value);
            if (type) handleUpdate(updateRow(scheme, activeRow, { type: type.value }));
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <SelectWrapper
          options={LIGHTS_FRAME_TEMPO_OPTIONS}
          value={`${frame.tempo}`}
          onChange={(value) => {
            const tempo = Number.parseInt(value, 10);
            if (tempo) handleUpdate(updateRow(scheme, activeRow, { tempo }));
          }}
        />
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          aria-label={MESSAGES.editor.addRow}
          disabled={rowsCount >= EDITOR_ROWS_MAX}
          onClick={() => {
            handleUpdate(addRow(scheme, activeRow));
            selectRow(activeRow + 1);
          }}
        >
          <ListPlusIcon />
        </Button>
        <Button
          aria-label={MESSAGES.editor.cloneRow}
          disabled={rowsCount >= EDITOR_ROWS_MAX}
          onClick={() => {
            handleUpdate(cloneRow(scheme, activeRow));
            selectRow(activeRow + 1);
          }}
        >
          <CopyPlusIcon />
        </Button>
        <Button
          aria-label={MESSAGES.editor.deleteRow}
          disabled={rowsCount <= 1}
          onClick={() => {
            handleUpdate(deleteRow(scheme, activeRow));
            selectRow(Math.max(0, activeRow - 1));
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
};
