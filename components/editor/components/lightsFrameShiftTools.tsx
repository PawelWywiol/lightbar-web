import {
  ArrowDownFromLineIcon,
  ArrowLeftFromLineIcon,
  ArrowLeftToLineIcon,
  ArrowRightFromLineIcon,
  ArrowRightToLineIcon,
  ArrowUpFromLineIcon,
  ShuffleIcon,
} from 'lucide-react';
import { Button } from '../../../lib/ui/button/button';
import { shiftRow, shiftScheme, shuffleRow } from '../editor.utils';
import { useEditorGrid, useEditorScheme } from '../providers';

const buttonClassName = 'flex-1 min-w-min';

export const LightsFrameShiftTools = () => {
  const { lightsScheme, handleUpdate } = useEditorScheme();
  const { activeRow } = useEditorGrid();
  const { scheme } = lightsScheme;

  return (
    <div className="flex gap-1 justify-center">
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftRow(scheme, activeRow, -1))}>
        <ArrowLeftToLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'left'))}>
        <ArrowLeftFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'up'))}>
        <ArrowUpFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shuffleRow(scheme, activeRow))}>
        <ShuffleIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'down'))}>
        <ArrowDownFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftScheme(scheme, 'right'))}>
        <ArrowRightFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => handleUpdate(shiftRow(scheme, activeRow, 1))}>
        <ArrowRightToLineIcon />
      </Button>
    </div>
  );
};
