import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UpdateColorDeviceEvent } from '../../../lib/devices/devicesEvents';
import {
  LIGHTS_BACKGROUND_COLOR,
  LIGHTS_PALLETTE_HUE_MASK,
  LIGHTS_PALLETTE_HUE_MAX,
  LIGHTS_PALLETTE_LIGHTNESS_MASK,
} from '../../../lib/lights/lights.config';
import type { LightColor } from '../../../lib/lights/lights.types';
import { createLightColor } from '../../../lib/lights/lights.utils';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { EDITOR_INITIAL_RECENT_COLORS_INDEX_MODULO } from '../editor.config';
import type { EditorColorPalette } from '../editor.types';
import { resolveBinaryColorStyle } from '../editor.utils';

// Static palette (computed once)
const colorPalette: EditorColorPalette[] = Array.from(
  { length: LIGHTS_PALLETTE_HUE_MASK + LIGHTS_PALLETTE_LIGHTNESS_MASK + 1 },
  (_, index) => index,
).map((index) => ({
  index,
  color: resolveBinaryColorStyle(createLightColor(index)),
}));

const initialRecentColors: EditorColorPalette[] = colorPalette
  .filter((c) => c.index % EDITOR_INITIAL_RECENT_COLORS_INDEX_MODULO === 0)
  .slice(2 * EDITOR_INITIAL_RECENT_COLORS_INDEX_MODULO, 3 * EDITOR_INITIAL_RECENT_COLORS_INDEX_MODULO);

const resolveHueColorPalette = (color: LightColor): EditorColorPalette[] => {
  const part = Math.floor(color / LIGHTS_PALLETTE_HUE_MAX);
  return colorPalette.slice(part * LIGHTS_PALLETTE_HUE_MAX, (part + 1) * LIGHTS_PALLETTE_HUE_MAX);
};

const resolveLightnessColorPalette = (color: LightColor): EditorColorPalette[] => {
  const partIndex = color % LIGHTS_PALLETTE_HUE_MAX;
  return colorPalette.filter((c) => c.index % LIGHTS_PALLETTE_HUE_MAX === partIndex);
};

interface EditorColorContextValue {
  color: LightColor;
  selectColor: (color: LightColor) => void;
  colorPalette: EditorColorPalette[];
  recentColors: EditorColorPalette[];
  hueColors: EditorColorPalette[];
  lightnessColors: EditorColorPalette[];
  isColorDialogOpen: boolean;
  handleColorDialogOpenChange: (open: boolean) => void;
}

const EditorColorContext = createContext<EditorColorContextValue | null>(null);

export const useEditorColor = () => {
  const ctx = useContext(EditorColorContext);
  if (!ctx) throw new Error('useEditorColor must be used within EditorColorProvider');
  return ctx;
};

export const EditorColorProvider = ({ children }: { children: ReactNode }) => {
  const [color, setColor] = useState<LightColor>(LIGHTS_BACKGROUND_COLOR);
  const [lastColorIndex, setLastColorIndex] = useState<number>(0);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<EditorColorPalette[]>(initialRecentColors);
  const [hueColors, setHueColors] = useState<EditorColorPalette[]>(resolveHueColorPalette(LIGHTS_BACKGROUND_COLOR));
  const [lightnessColors, setLightnessColors] = useState<EditorColorPalette[]>(
    resolveLightnessColorPalette(LIGHTS_BACKGROUND_COLOR),
  );

  const selectColor = useCallback((index: LightColor) => {
    setColor(index);
  }, []);

  const handleColorDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsColorDialogOpen(open);
      if (open) {
        setLastColorIndex(color);
        return;
      }
      if (lastColorIndex === color) return;

      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c.index !== color);
        const selected = colorPalette.find((c) => c.index === color);
        if (!selected) return prev;
        filtered.unshift(selected);
        return filtered.slice(0, initialRecentColors.length);
      });
    },
    [color, lastColorIndex],
  );

  // Dispatch color update to device when picker is open
  useEffect(() => {
    if (isColorDialogOpen) {
      dispatchCustomEvent<UpdateColorDeviceEvent>({
        name: 'app:update:color',
        detail: { color },
      });
    }
  }, [isColorDialogOpen, color]);

  // Update derived palettes
  useEffect(() => {
    setHueColors(resolveHueColorPalette(color));
    setLightnessColors(resolveLightnessColorPalette(color));
  }, [color]);

  const value = useMemo(
    () => ({
      color,
      selectColor,
      colorPalette,
      recentColors,
      hueColors,
      lightnessColors,
      isColorDialogOpen,
      handleColorDialogOpenChange,
    }),
    [color, selectColor, recentColors, hueColors, lightnessColors, isColorDialogOpen, handleColorDialogOpenChange],
  );

  return <EditorColorContext.Provider value={value}>{children}</EditorColorContext.Provider>;
};
