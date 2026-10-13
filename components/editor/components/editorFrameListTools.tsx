import { CopyPlusIcon, ListPlusIcon, Trash2Icon } from 'lucide-react';
import { useMessages } from '../../../lib/i18n/i18n';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { EDITOR_ROWS_MAX } from '../editor.config';
import { addRow, cloneRow, deleteRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

export const EditorFrameListTools = () => {
  const messages = useMessages();
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow, setActiveRow, setPreviewRow } = useEditorGrid();
  const { scheme } = lightsScheme;
  const rowsCount = scheme.frames.length;
  const selectRow = (row: number) => {
    setActiveRow(row);
    setPreviewRow(row);
  };

  return (
    <div className="flex gap-1">
      <Tooltip content={messages.editor.tooltip.addRow}>
        <Button
          aria-label={messages.editor.addRow}
          disabled={rowsCount >= EDITOR_ROWS_MAX}
          onClick={() => {
            handleUpdate(addRow(scheme, activeRow));
            selectRow(activeRow + 1);
          }}
        >
          <ListPlusIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.cloneRow}>
        <Button
          aria-label={messages.editor.cloneRow}
          disabled={rowsCount >= EDITOR_ROWS_MAX}
          onClick={() => {
            handleUpdate(cloneRow(scheme, activeRow));
            selectRow(activeRow + 1);
          }}
        >
          <CopyPlusIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.deleteRow}>
        <Button
          aria-label={messages.editor.deleteRow}
          disabled={rowsCount <= 1}
          onClick={() => {
            handleUpdate(deleteRow(scheme, activeRow));
            selectRow(Math.max(0, activeRow - 1));
          }}
        >
          <Trash2Icon />
        </Button>
      </Tooltip>
    </div>
  );
};
