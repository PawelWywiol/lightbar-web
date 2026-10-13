import { CopyPlusIcon, ListPlusIcon, Trash2Icon } from 'lucide-react';
import { useMessages } from '../../../lib/i18n/i18n';
import { EDITOR_ROWS_MAX } from '../editor.config';
import { addRow, cloneRow, deleteRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';
import { EditorToolButton } from './editorToolButton';

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
    <>
      <EditorToolButton
        tooltip={messages.editor.tooltip.addRow}
        icon={<ListPlusIcon />}
        label={messages.editor.short.addRow}
        aria-label={messages.editor.addRow}
        disabled={rowsCount >= EDITOR_ROWS_MAX}
        onClick={() => {
          handleUpdate(addRow(scheme, activeRow));
          selectRow(activeRow + 1);
        }}
      />
      <EditorToolButton
        tooltip={messages.editor.tooltip.cloneRow}
        icon={<CopyPlusIcon />}
        label={messages.editor.short.cloneRow}
        aria-label={messages.editor.cloneRow}
        disabled={rowsCount >= EDITOR_ROWS_MAX}
        onClick={() => {
          handleUpdate(cloneRow(scheme, activeRow));
          selectRow(activeRow + 1);
        }}
      />
      <EditorToolButton
        tooltip={messages.editor.tooltip.deleteRow}
        icon={<Trash2Icon />}
        label={messages.editor.short.deleteRow}
        aria-label={messages.editor.deleteRow}
        disabled={rowsCount <= 1}
        onClick={() => {
          handleUpdate(deleteRow(scheme, activeRow));
          selectRow(Math.max(0, activeRow - 1));
        }}
      />
    </>
  );
};
