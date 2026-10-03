import { RedoDotIcon, UndoDotIcon } from 'lucide-react';
import { MESSAGES } from '../../../lib/config/messages';
import { LIGHTS_SCHEME_NAME_MAX_LENGTH } from '../../../lib/lights/lights.config';
import { Button } from '../../../lib/ui/button/button';
import { Input } from '../../../lib/ui/input/input';
import { useEditorScheme } from '../providers';

export const LightsSchemeStateTools = () => {
  const { lightsScheme, handleUndo, undoAvailable, handleRedo, redoAvailable, handleUpdate, handleSave } =
    useEditorScheme();

  return (
    <div className="flex justify-center content-center gap-4">
      <div className="flex justify-center content-center gap-2">
        <Button aria-label={MESSAGES.editor.undo} disabled={!undoAvailable} onClick={handleUndo}>
          <UndoDotIcon />
        </Button>
        <Button aria-label={MESSAGES.editor.redo} disabled={!redoAvailable} onClick={handleRedo}>
          <RedoDotIcon />
        </Button>
      </div>
      <div className="flex flex-1 justify-stretch">
        <Input
          className="w-full"
          value={lightsScheme.scheme.name}
          onChange={(event) => {
            handleUpdate({
              ...lightsScheme.scheme,
              name: event.target.value,
            });
          }}
          maxLength={LIGHTS_SCHEME_NAME_MAX_LENGTH}
        />
      </div>
      <div className="flex">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
};
