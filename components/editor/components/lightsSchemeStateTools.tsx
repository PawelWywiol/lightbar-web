import { RedoDotIcon, UndoDotIcon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { LIGHTS_SCHEME_NAME_MAX_LENGTH } from '../../../lib/lights/lights.config';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { Input } from '../../../lib/ui/input/input';
import { useEditorScheme } from '../providers';
import { EditorPublishButton } from './editorPublishButton';

export const LightsSchemeStateTools = () => {
  const { lightsScheme, handleUndo, undoAvailable, handleRedo, redoAvailable, handleUpdate, handleSave } =
    useEditorScheme();

  return (
    <div className="flex justify-center content-center gap-4">
      <div className="flex justify-center content-center gap-2">
        <Tooltip content={MESSAGES.editor.tooltip.undo}>
          <Button aria-label={MESSAGES.editor.undo} disabled={!undoAvailable} onClick={handleUndo}>
            <UndoDotIcon />
          </Button>
        </Tooltip>
        <Tooltip content={MESSAGES.editor.tooltip.redo}>
          <Button aria-label={MESSAGES.editor.redo} disabled={!redoAvailable} onClick={handleRedo}>
            <RedoDotIcon />
          </Button>
        </Tooltip>
      </div>
      <div className="flex flex-1 justify-stretch">
        <Tooltip content={MESSAGES.editor.tooltip.schemeName}>
          <Input
            className="w-full"
            aria-label={MESSAGES.editor.schemeName}
            value={lightsScheme.scheme.name}
            onChange={(event) => {
              handleUpdate({
                ...lightsScheme.scheme,
                name: event.target.value,
              });
            }}
            maxLength={LIGHTS_SCHEME_NAME_MAX_LENGTH}
          />
        </Tooltip>
      </div>
      <div className="flex gap-2">
        <Tooltip content={MESSAGES.editor.tooltip.save}>
          <Button onClick={handleSave}>{MESSAGES.editor.save}</Button>
        </Tooltip>
        <EditorPublishButton />
      </div>
    </div>
  );
};
