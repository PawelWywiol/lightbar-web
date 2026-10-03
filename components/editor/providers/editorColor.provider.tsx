import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UpdateColorDeviceEvent } from '../../../lib/devices/devicesEvents';
import {
  createLightColor,
  LIGHTS_PALLETTE_HUE_MASK,
  LIGHTS_PALLETTE_HUE_MAX,
  LIGHTS_PALLETTE_LIGHTNESS_MASK,
} from '../../../lib/lights/lights.config';
import type { LightColor } from '../../../lib/lights/lights.types';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { EDITOR_DEFAULT_COLOR, EDITOR_RECENT_COLORS_COUNT, EDITOR_RECENT_COLORS_STEP } from '../editor.config';
import type { EditorColorPalette } from '../editor.types';
import { pushRecentColor, resolveBinaryColorStyle } from '../editor.utils';

// Static palette (computed once)
const colorPalette: EditorColorPalette[] = Array.from(
  { length: LIGHTS_PALLETTE_HUE_MASK + LIGHTS_PALLETTE_LIGHTNESS_MASK + 1 },
  (_, index) => index,
).map((index) => ({
  index,
  color: resolveBinaryColorStyle(createLightColor(index)),
}));

const defaultColor = createLightColor(EDITOR_DEFAULT_COLOR);

const initialRecentColors: LightColor[] = Array.from({ length: EDITOR_RECENT_COLORS_COUNT }, (_, index) =>
  createLightColor((index + 1) * EDITOR_RECENT_COLORS_STEP),
);

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
  selectRecentColor: (index: number) => void;
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
  const [color, setColor] = useState<LightColor>(defaultColor);
  const [lastColorIndex, setLastColorIndex] = useState<LightColor>(defaultColor);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [recent, setRecent] = useState<LightColor[]>(initialRecentColors);
  const recentColors = useMemo(
    () => recent.map((index) => ({ index, color: resolveBinaryColorStyle(index) })),
    [recent],
  );
  const hueColors = useMemo(() => resolveHueColorPalette(color), [color]);
  const lightnessColors = useMemo(() => resolveLightnessColorPalette(color), [color]);

  const selectColor = useCallback((index: LightColor) => {
    setColor(index);
  }, []);

  const selectRecentColor = useCallback(
    (index: number) => {
      const next = recent[index];
      if (next === undefined) return;
      setRecent(pushRecentColor(recent, color, next));
      setColor(next);
    },
    [recent, color],
  );

  const handleColorDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsColorDialogOpen(open);
      if (open) {
        setLastColorIndex(color);
        return;
      }
      setRecent((prev) => pushRecentColor(prev, lastColorIndex, color));
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

  const value = useMemo(
    () => ({
      color,
      selectColor,
      colorPalette,
      recentColors,
      selectRecentColor,
      hueColors,
      lightnessColors,
      isColorDialogOpen,
      handleColorDialogOpenChange,
    }),
    [
      color,
      selectColor,
      recentColors,
      selectRecentColor,
      hueColors,
      lightnessColors,
      isColorDialogOpen,
      handleColorDialogOpenChange,
    ],
  );

  return <EditorColorContext.Provider value={value}>{children}</EditorColorContext.Provider>;
};
