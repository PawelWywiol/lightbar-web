import { MESSAGES } from '../../../lib/config/messages';
import type { LightColor } from '../../../lib/lights/lights.types';
import { createLightColor } from '../../../lib/lights/lights.config';
import { Button } from '../../../lib/ui/button/button';
import { DialogWrapper } from '../../../lib/ui/dialog/dialog';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { cn } from '../../../lib/ui/utils/cn';
import type { EditorColorPalette } from '../editor.types';
import { resolveBinaryColorStyle } from '../editor.utils';
import { useEditorColor } from '../providers';

const ColorPickerGrid = ({
  className,
  colorPalette,
  selectColor,
  activeColor,
}: {
  className?: string;
  colorPalette: EditorColorPalette[];
  selectColor: (index: LightColor) => void;
  activeColor: LightColor;
}) => (
  <div className={cn('grid grid-cols-8 gap-1 desktop:gap-1 items-center justify-center', className)}>
    {colorPalette.map(({ index, color }) => (
      <button
        key={`color-${index}-${color}`}
        type="button"
        className="w-full h-10 rounded cursor-pointer flex justify-center items-center outline-none"
        onClick={() => selectColor(createLightColor(index))}
        style={{ background: color }}
      >
        {index === activeColor && (
          <span className="flex items-center justify-center w-4 aspect-square rounded-full bg-[white] shadow-md" />
        )}
      </button>
    ))}
  </div>
);

export const ColorPickerTools = () => {
  const {
    handleColorDialogOpenChange,
    color,
    selectColor,
    recentColors,
    selectRecentColor,
    hueColors,
    lightnessColors,
  } = useEditorColor();

  return (
    <>
      <DialogWrapper
        onOpenChange={handleColorDialogOpenChange}
        trigger={
          <Tooltip content={MESSAGES.editor.tooltip.choseColor}>
            <Button aria-label={MESSAGES.editor.choseColor} className="flex-1 min-w-0 rounded px-2">
              <span className="rounded border w-full h-5" style={{ backgroundColor: resolveBinaryColorStyle(color) }} />
            </Button>
          </Tooltip>
        }
        title={MESSAGES.editor.choseColor}
      >
        <ColorPickerGrid colorPalette={hueColors} selectColor={selectColor} activeColor={color} />
        <ColorPickerGrid
          className="pt-2 mt-2 border-t grid-cols-4"
          colorPalette={lightnessColors}
          selectColor={selectColor}
          activeColor={color}
        />
        <ColorPickerGrid
          className="pt-2 mt-2 border-t grid-cols-7"
          colorPalette={recentColors}
          selectColor={selectColor}
          activeColor={color}
        />
      </DialogWrapper>
      {recentColors.map(({ color: background }, position) => (
        <Tooltip
          // oxlint-disable-next-line react/no-array-index-key -- fixed slots keep focus on the clicked button
          key={`recent-${position}`}
          content={MESSAGES.editor.tooltip.recentColor}
        >
          <button
            type="button"
            aria-label={`${MESSAGES.editor.recentColor} ${position + 1}`}
            className="h-10 w-8 shrink-0 rounded border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => selectRecentColor(position)}
            style={{ backgroundColor: background }}
          />
        </Tooltip>
      ))}
    </>
  );
};
