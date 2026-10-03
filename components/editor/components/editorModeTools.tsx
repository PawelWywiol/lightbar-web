import { PaintbrushIcon, Rows3Icon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { useEditorGrid } from '../providers';
import { ColorPickerTools } from './colorPickerTools';
import { EditorRowTools } from './editorRowTools';
import { LightsCountTools } from './lightsCountTools';

export const EditorModeTools = () => {
  const { mode, setMode } = useEditorGrid();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-2">
        <div className="flex gap-1">
          <Tooltip content={MESSAGES.editor.tooltip.paintMode}>
            <Button
              aria-label={MESSAGES.editor.paintMode}
              aria-pressed={mode === 'paint'}
              variant={mode === 'paint' ? 'secondary' : 'default'}
              onClick={() => setMode('paint')}
            >
              <PaintbrushIcon />
            </Button>
          </Tooltip>
          <Tooltip content={MESSAGES.editor.tooltip.editMode}>
            <Button
              aria-label={MESSAGES.editor.editMode}
              aria-pressed={mode === 'edit'}
              variant={mode === 'edit' ? 'secondary' : 'default'}
              onClick={() => setMode('edit')}
            >
              <Rows3Icon />
            </Button>
          </Tooltip>
        </div>
        <LightsCountTools />
      </div>
      {mode === 'paint' ? (
        <div className="flex gap-1">
          <ColorPickerTools />
        </div>
      ) : (
        <EditorRowTools />
      )}
    </div>
  );
};
