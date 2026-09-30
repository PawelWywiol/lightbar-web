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

import { useEditor } from '../editor.provider';
import type { ShiftDirection } from '../editor.types';
import { shiftLightsFrameColorPixel } from '../editor.utils';

const buttonClassName = 'flex-1 min-w-min';

export const LightsFrameShiftTools = () => {
  const { lightsScheme, lightsLayout, frameIndex, handleUpdate } = useEditor();

  const shiftLightsFrame = (direction: ShiftDirection) =>
    handleUpdate(
      shiftLightsFrameColorPixel(lightsScheme.scheme, frameIndex, direction, lightsLayout),
    );

  return (
    <div className="flex gap-1 justify-center">
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('prev')}>
        <ArrowLeftToLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('left')}>
        <ArrowLeftFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('up')}>
        <ArrowUpFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('shuffle')}>
        <ShuffleIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('down')}>
        <ArrowDownFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('right')}>
        <ArrowRightFromLineIcon />
      </Button>
      <Button className={buttonClassName} onClick={() => shiftLightsFrame('next')}>
        <ArrowRightToLineIcon />
      </Button>
    </div>
  );
};
