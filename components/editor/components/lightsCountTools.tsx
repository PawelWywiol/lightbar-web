import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useMessages } from '../../../lib/i18n/i18n';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { Input } from '../../../lib/ui/input/input';
import { EDITOR_LIGHTS_COUNT_MAX, EDITOR_LIGHTS_COUNT_MIN } from '../editor.config';
import { clampLightsCount, getLightsCount, resizeScheme } from '../editor.utils';
import { useEditorScheme } from '../providers';

export const LightsCountTools = () => {
  const messages = useMessages();
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const [draft, setDraft] = useState<string | null>(null);
  const lightsCount = getLightsCount(lightsScheme.scheme);

  const setLightsCount = (value: number) => {
    const next = clampLightsCount(value);
    if (next !== lightsCount) handleUpdate(resizeScheme(lightsScheme.scheme, next));
  };

  const commitDraft = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (!Number.isNaN(value)) setLightsCount(value);
    setDraft(null);
  };

  return (
    <div className="flex flex-1 gap-1.5">
      <Tooltip content={messages.editor.tooltip.decreaseLights}>
        <Button
          size="icon"
          className="h-9 w-9"
          aria-label={messages.editor.decreaseLights}
          disabled={lightsCount <= EDITOR_LIGHTS_COUNT_MIN}
          onClick={() => setLightsCount(lightsCount - 1)}
        >
          <MinusIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.lightsCount}>
        <Input
          className="h-9 flex-1 text-center"
          inputMode="numeric"
          aria-label={messages.editor.lightsCount}
          value={draft ?? `${lightsCount}`}
          onChange={(event) => setDraft(event.target.value.replaceAll(/\D/g, ''))}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.increaseLights}>
        <Button
          size="icon"
          className="h-9 w-9"
          aria-label={messages.editor.increaseLights}
          disabled={lightsCount >= EDITOR_LIGHTS_COUNT_MAX}
          onClick={() => setLightsCount(lightsCount + 1)}
        >
          <PlusIcon />
        </Button>
      </Tooltip>
    </div>
  );
};
