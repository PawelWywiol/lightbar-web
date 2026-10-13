import { ArrowLeftIcon, PlayIcon, RedoDotIcon, UndoDotIcon } from 'lucide-react';
import { Link } from 'react-router';
import { useMessages } from '../../../lib/i18n/i18n';
import { LIGHTS_SCHEME_NAME_MAX_LENGTH } from '../../../lib/lights/lights.config';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { Input } from '../../../lib/ui/input/input';
import { useEditorScheme } from '../providers';
import { EditorPublishButton } from './editorPublishButton';

export const LightsSchemeStateTools = () => {
  const messages = useMessages();
  const { lightsScheme, handleUndo, undoAvailable, handleRedo, redoAvailable, handleUpdate, handleSave, handlePlay } =
    useEditorScheme();

  return (
    <div className="flex items-center gap-1">
      <Link
        to="/"
        aria-label={messages.editor.back}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-accent md:hidden"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Link>
      <Tooltip content={messages.editor.tooltip.schemeName}>
        <Input
          className="h-9 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-title font-bold hover:border-input"
          aria-label={messages.editor.schemeName}
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
      <Tooltip content={messages.editor.tooltip.undo}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={messages.editor.undo}
          disabled={!undoAvailable}
          onClick={handleUndo}
        >
          <UndoDotIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.redo}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={messages.editor.redo}
          disabled={!redoAvailable}
          onClick={handleRedo}
        >
          <RedoDotIcon />
        </Button>
      </Tooltip>
      <EditorPublishButton />
      <Tooltip content={messages.editor.tooltip.save}>
        <Button size="sm" onClick={handleSave}>
          {messages.editor.save}
        </Button>
      </Tooltip>
      <Tooltip content={messages.schemes.send}>
        <Button size="sm" variant="primary" onClick={handlePlay}>
          <PlayIcon className="fill-current" />
          {messages.schemes.play}
        </Button>
      </Tooltip>
    </div>
  );
};
