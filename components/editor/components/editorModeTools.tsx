import { PaintbrushIcon, Rows3Icon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { Button } from '../../../lib/ui/button/button';
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
          <Button
            aria-label={MESSAGES.editor.paintMode}
            aria-pressed={mode === 'paint'}
            variant={mode === 'paint' ? 'secondary' : 'default'}
            onClick={() => setMode('paint')}
          >
            <PaintbrushIcon />
          </Button>
          <Button
            aria-label={MESSAGES.editor.editMode}
            aria-pressed={mode === 'edit'}
            variant={mode === 'edit' ? 'secondary' : 'default'}
            onClick={() => setMode('edit')}
          >
            <Rows3Icon />
          </Button>
        </div>
        <LightsCountTools />
      </div>
      {mode === 'paint' ? <ColorPickerTools /> : <EditorRowTools />}
    </div>
  );
};
