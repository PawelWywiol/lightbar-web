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
import { cn } from '../../../lib/ui/utils/cn';
import { shiftRow, shiftScheme, shuffleRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';
import { LightsCountTools } from './lightsCountTools';

const buttonClassName = 'h-10 min-w-0 px-0';
const captionClassName = 'truncate text-2xs font-bold uppercase tracking-wider text-muted-foreground';

export const LightsFrameShiftTools = () => {
  const messages = useMessages();
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow } = useEditorGrid();
  const { scheme } = lightsScheme;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        <span className={cn(captionClassName, 'col-span-3')}>{messages.editor.activeRow}</span>
        <span className={cn(captionClassName, 'col-span-4')}>{messages.editor.allRows}</span>
        <Tooltip content={messages.editor.tooltip.shiftRowLeft}>
          <Button
            className={buttonClassName}
            aria-label={messages.editor.shiftRowLeft}
            onClick={() => handleUpdate(shiftRow(scheme, activeRow, -1))}
          >
            <ArrowLeftToLineIcon />
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
        <Tooltip content={messages.editor.tooltip.shiftRowRight}>
          <Button
            className={buttonClassName}
            aria-label={messages.editor.shiftRowRight}
            onClick={() => handleUpdate(shiftRow(scheme, activeRow, 1))}
          >
            <ArrowRightToLineIcon />
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
      </div>
      <div className="flex items-center gap-3">
        <span className={captionClassName}>{messages.editor.lightsCount}</span>
        <LightsCountTools />
      </div>
    </div>
  );
};
