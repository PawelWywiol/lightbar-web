import { useMessages } from '../../../lib/i18n/i18n';
import type { LightColor } from '../../../lib/lights/lights.types';
import { createLightColor } from '../../../lib/lights/lights.config';
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
  <div className={cn('grid grid-cols-8 gap-1 items-center justify-center', className)}>
    {colorPalette.map(({ index, color }) => (
      <button
        key={`color-${index}-${color}`}
        type="button"
        className="w-full h-10 rounded-lg cursor-pointer flex justify-center items-center outline-none"
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

const QUICK_COLORS_COUNT = 8;

const swatchClassName =
  'aspect-square w-full cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const activeSwatchClassName = 'shadow-[0_0_0_2px_var(--color-card),0_0_0_4px_var(--color-foreground)]';

export const ColorPickerTools = () => {
  const messages = useMessages();
  const {
    handleColorDialogOpenChange,
    color,
    selectColor,
    recentColors,
    selectRecentColor,
    hueColors,
    lightnessColors,
  } = useEditorColor();

  const quickStep = hueColors.length / QUICK_COLORS_COUNT;
  const quickColors = hueColors.filter((_, index) => index % quickStep === quickStep / 2);

  return (
    <div className="grid grid-cols-8 gap-1.5">
      {quickColors.map(({ index, color: background }, position) => (
        <button
          key={`quick-${index}`}
          type="button"
          aria-label={`${messages.editor.paletteColor} ${position + 1}`}
          aria-pressed={index === color}
          className={cn(swatchClassName, index === color && activeSwatchClassName)}
          onClick={() => selectColor(createLightColor(index))}
          style={{ backgroundColor: background }}
        />
      ))}
      <DialogWrapper
        onOpenChange={handleColorDialogOpenChange}
        trigger={
          <Tooltip content={messages.editor.tooltip.choseColor}>
            <button
              type="button"
              aria-label={messages.editor.choseColor}
              className={cn(swatchClassName, activeSwatchClassName, 'grid place-items-center p-1')}
            >
              <span
                className="h-full w-full rounded-full"
                style={{ backgroundColor: resolveBinaryColorStyle(color) }}
              />
            </button>
          </Tooltip>
        }
        title={messages.editor.choseColor}
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
          content={messages.editor.tooltip.recentColor}
        >
          <button
            type="button"
            aria-label={`${messages.editor.recentColor} ${position + 1}`}
            className={swatchClassName}
            onClick={() => selectRecentColor(position)}
            style={{ backgroundColor: background }}
          />
        </Tooltip>
      ))}
    </div>
  );
};
