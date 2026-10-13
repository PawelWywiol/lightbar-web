import {
  ArrowDownFromLineIcon,
  ArrowLeftFromLineIcon,
  ArrowLeftToLineIcon,
  ArrowRightFromLineIcon,
  ArrowRightToLineIcon,
  ArrowUpFromLineIcon,
  ShuffleIcon,
} from 'lucide-react';
import { useMessages } from '../../../lib/i18n/i18n';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { shiftRow, shiftScheme, shuffleRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

const buttonClassName = 'flex-1 min-w-min';

export const LightsFrameShiftTools = () => {
  const messages = useMessages();
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow } = useEditorGrid();
  const { scheme } = lightsScheme;

  return (
    <div className="flex gap-1 justify-center">
      <Tooltip content={messages.editor.tooltip.shiftRowLeft}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.shiftRowLeft}
          onClick={() => handleUpdate(shiftRow(scheme, activeRow, -1))}
        >
          <ArrowLeftToLineIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.shiftAllLeft}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.shiftAllLeft}
          onClick={() => handleUpdate(shiftScheme(scheme, 'left'))}
        >
          <ArrowLeftFromLineIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.rotateRowsUp}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.rotateRowsUp}
          onClick={() => handleUpdate(shiftScheme(scheme, 'up'))}
        >
          <ArrowUpFromLineIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.shuffleRow}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.shuffleRow}
          onClick={() => handleUpdate(shuffleRow(scheme, activeRow))}
        >
          <ShuffleIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.rotateRowsDown}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.rotateRowsDown}
          onClick={() => handleUpdate(shiftScheme(scheme, 'down'))}
        >
          <ArrowDownFromLineIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.shiftAllRight}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.shiftAllRight}
          onClick={() => handleUpdate(shiftScheme(scheme, 'right'))}
        >
          <ArrowRightFromLineIcon />
        </Button>
      </Tooltip>
      <Tooltip content={messages.editor.tooltip.shiftRowRight}>
        <Button
          className={buttonClassName}
          aria-label={messages.editor.shiftRowRight}
          onClick={() => handleUpdate(shiftRow(scheme, activeRow, 1))}
        >
          <ArrowRightToLineIcon />
        </Button>
      </Tooltip>
    </div>
  );
};
