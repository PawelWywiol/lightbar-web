import { useState } from 'react';
import { useMessages } from '../../../lib/i18n/i18n';
import { cn } from '../../../lib/ui/utils/cn';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { useEditorGrid } from '../providers';
import { ColorPickerTools } from './colorPickerTools';
import { EditorFrameListTools } from './editorFrameListTools';
import { EditorRowTools } from './editorRowTools';
import { LightsFrameShiftTools } from './lightsFrameShiftTools';

type EditorTab = 'paint' | 'rows' | 'motion';

const TabButton = ({
  tooltip,
  label,
  isActive,
  onClick,
}: {
  tooltip: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <Tooltip content={tooltip}>
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-md py-1.5 text-xs font-bold text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'bg-accent text-foreground',
      )}
    >
      {label}
    </button>
  </Tooltip>
);

export const EditorModeTools = () => {
  const messages = useMessages();
  const { mode, setMode } = useEditorGrid();
  const [tab, setTab] = useState<EditorTab>(mode === 'paint' ? 'paint' : 'rows');

  const selectTab = (next: EditorTab) => {
    setTab(next);
    setMode(next === 'paint' ? 'paint' : 'edit');
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-inset p-1">
        <TabButton
          tooltip={messages.editor.tooltip.paintMode}
          label={messages.editor.paintMode}
          isActive={tab === 'paint'}
          onClick={() => selectTab('paint')}
        />
        <TabButton
          tooltip={messages.editor.tooltip.editMode}
          label={messages.editor.editMode}
          isActive={tab === 'rows'}
          onClick={() => selectTab('rows')}
        />
        <TabButton
          tooltip={messages.editor.tooltip.motionMode}
          label={messages.editor.motionMode}
          isActive={tab === 'motion'}
          onClick={() => selectTab('motion')}
        />
      </div>
      {tab === 'paint' && <ColorPickerTools />}
      {tab === 'rows' && (
        <div className="grid grid-cols-5 gap-1.5">
          <EditorFrameListTools />
          <EditorRowTools />
        </div>
      )}
      {tab === 'motion' && <LightsFrameShiftTools />}
    </div>
  );
};
