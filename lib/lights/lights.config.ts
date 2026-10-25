import type { LightColor, LightsFrame, LightsFrameSelectOption, LightsFrameType, LightsScheme } from './lights.types';

export const LIGHTS_SCHEME_NAME_MAX_LENGTH = 16;

export const LIGHTS_PALLETTE_HUE_MASK = 0b0011_1111;
export const LIGHTS_PALLETTE_HUE_MAX = LIGHTS_PALLETTE_HUE_MASK + 1;
export const LIGHTS_PALLETTE_LIGHTNESS_MASK = 0b1100_0000;
export const LIGHTS_PALLETTE_LIGHTNESS_STEP = 30;
export const LIGHTS_PALLETTE_LIGHTNESS_BASE = 10;
// Screens render the device's dimmest level near black; preview keeps it visible.
export const LIGHTS_PREVIEW_MIN_VALUE = 28;

export const createLightColor = (index: number): LightColor => {
  if (index < 0 || index > LIGHTS_PALLETTE_HUE_MASK + LIGHTS_PALLETTE_LIGHTNESS_MASK) {
    throw new Error(`Invalid color index: ${index}`);
  }

  return index as LightColor;
};

const createLightColorsArray = (indexes: number[]): LightColor[] => indexes.map((index) => createLightColor(index));

export const LIGHTS_BACKGROUND_COLOR: LightColor = createLightColor(LIGHTS_PALLETTE_HUE_MASK);

export const LIGHTS_FRAME_TEMPO_OPTIONS: LightsFrameSelectOption[] = [
  {
    value: '249',
    label: '10 FPS',
  },
  {
    value: '240',
    label: '4 FPS',
  },
  {
    value: '120',
    label: '2 FPS',
  },
  {
    value: '60',
    label: '1.00 s',
  },
  {
    value: '48',
    label: '1.25 s',
  },
  {
    value: '32',
    label: '1.88 s',
  },
  {
    value: '16',
    label: '3.75 s',
  },
  {
    value: '8',
    label: '7.50 s',
  },
  {
    value: '4',
    label: '15 s',
  },
  {
    value: '3',
    label: '20 s',
  },
  {
    value: '2',
    label: '30 s',
  },
  {
    value: '1',
    label: '1 min',
  },
];

export const DEFAULT_LIGHTS_FRAME_TEMPO = 60;

const LIGHTS_LOOP_FPS = 60;
const LIGHTS_TICKS_PER_MINUTE = LIGHTS_LOOP_FPS * 60;
const LIGHTS_TEMPO_BPM_MAX = 240;
const LIGHTS_TEMPO_RESERVED = 255;

const resolveFrameTicks = (tempo: number): number => {
  if (tempo > LIGHTS_TEMPO_BPM_MAX) {
    return tempo < LIGHTS_TEMPO_RESERVED ? LIGHTS_TEMPO_RESERVED - tempo : 1;
  }

  return Math.round(LIGHTS_TICKS_PER_MINUTE / (tempo || 1));
};

export const resolveFrameSeconds = (tempo: number): number => resolveFrameTicks(tempo) / LIGHTS_LOOP_FPS;
export const DEFAULT_LIGHTS_FRAME_TYPE: LightsFrameType = 0;
export const LIGHTS_FRAME_TYPE_MASK = 0b01;
export const LIGHTS_FRAME_SHUFFLE_FLAG = 0b10;
export const LIGHTS_FRAME_HUE_SHIFT_OFFSET = 2;
export const LIGHTS_FRAME_HUE_SHIFT_MASK = 0b11_1111;
export const LIGHTS_PALLETTE_CHROMATIC_HUES = LIGHTS_PALLETTE_HUE_MASK;

export const addHueOffset = (hueOffset: number, hueShift: number): number =>
  (((hueOffset + hueShift) % LIGHTS_PALLETTE_CHROMATIC_HUES) + LIGHTS_PALLETTE_CHROMATIC_HUES) %
  LIGHTS_PALLETTE_CHROMATIC_HUES;

export const shiftColorHue = (color: LightColor, hueOffset: number): LightColor => {
  const hue = color & LIGHTS_PALLETTE_HUE_MASK;
  if (hue === LIGHTS_PALLETTE_HUE_MASK) return color;
  return ((color & LIGHTS_PALLETTE_LIGHTNESS_MASK) | addHueOffset(hue, hueOffset)) as LightColor;
};

export const addPixelOffset = (pixelOffset: number, pixelShift: number, lightsCount: number): number =>
  lightsCount ? (((pixelOffset + pixelShift) % lightsCount) + lightsCount) % lightsCount : 0;

export const rotateColors = (colors: LightColor[], pixelOffset: number): LightColor[] =>
  colors.map((_, index) => colors[addPixelOffset(index, -pixelOffset, colors.length)] as LightColor);

export const resolveSchemePixelOffsets = (frames: LightsFrame[]): number[] => {
  let pixelOffset = 0;
  return frames.map((frame) => {
    pixelOffset = addPixelOffset(pixelOffset, frame.pixelShift, frame.colors.length);
    return pixelOffset;
  });
};

const LIGHTS_FRAME_PIXEL_SHIFT_MIN = -128;
const LIGHTS_FRAME_PIXEL_SHIFT_MAX = 127;

const resolvePixelShiftRange = (lightsCount: number) => ({
  min: Math.max(LIGHTS_FRAME_PIXEL_SHIFT_MIN, 1 - lightsCount),
  max: Math.min(LIGHTS_FRAME_PIXEL_SHIFT_MAX, lightsCount - 1),
});

export const clampPixelShift = (pixelShift: number, lightsCount: number): number => {
  const { min, max } = resolvePixelShiftRange(lightsCount);
  return Math.min(max, Math.max(min, pixelShift));
};

export const createPixelShiftOptions = (lightsCount: number, noShiftLabel: string): LightsFrameSelectOption[] => {
  const { min, max } = resolvePixelShiftRange(lightsCount);
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const pixelShift = min + index;
    return { value: `${pixelShift}`, label: pixelShift ? `${pixelShift > 0 ? '+' : ''}${pixelShift}` : noShiftLabel };
  });
};

const greatestCommonDivisor = (a: number, b: number): number => (b ? greatestCommonDivisor(b, a % b) : a);

const resolveColorsPeriod = (colors: LightColor[]): number => {
  for (let period = 1; period < colors.length; period++) {
    if (colors.length % period === 0 && colors.every((color, index) => color === colors[index % period])) {
      return period;
    }
  }
  return colors.length;
};

// Shuffled frames look the same on any length, so they never constrain the period.
export const resolveSchemePeriod = (frames: LightsFrame[]): number =>
  frames.reduce((period, frame) => {
    const framePeriod = frame.shuffle ? 1 : resolveColorsPeriod(frame.colors);
    return (period / greatestCommonDivisor(period, framePeriod)) * framePeriod;
  }, 1);

export const resolveSchemeHueOffsets = (frames: LightsFrame[]): number[] => {
  let hueOffset = 0;
  return frames.map((frame) => {
    hueOffset = addHueOffset(hueOffset, frame.hueShift);
    return hueOffset;
  });
};

const LIGHTS_FRAME_HUE_SHIFT_MAX = 31;
const LIGHTS_FRAME_HUE_SHIFT_MIN = -32;

const createHueShiftOption = (hueShift: number, noShiftLabel: string): LightsFrameSelectOption => ({
  value: `${hueShift}`,
  label: hueShift
    ? `${hueShift > 0 ? '+' : ''}${hueShift} (${((hueShift * 360) / LIGHTS_PALLETTE_HUE_MAX).toFixed(1)}°)`
    : noShiftLabel,
});

export const createHueShiftOptions = (noShiftLabel: string): LightsFrameSelectOption[] =>
  Array.from({ length: LIGHTS_FRAME_HUE_SHIFT_MAX - LIGHTS_FRAME_HUE_SHIFT_MIN + 1 }, (_, index) =>
    createHueShiftOption(LIGHTS_FRAME_HUE_SHIFT_MIN + index, noShiftLabel),
  );

const DEFAULT_LIGHTS_FRAME: LightsFrame = {
  type: DEFAULT_LIGHTS_FRAME_TYPE,
  shuffle: false,
  hueShift: 0,
  pixelShift: 0,
  tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
  colors: [],
};

export const createDefaultLightsScheme = (name: string): LightsScheme => ({
  name,
  frames: [
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([12, 20, 28, 36, 44, 52, 60, 64].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([20, 28, 36, 44, 52, 60, 64, 12].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([28, 36, 44, 52, 60, 64, 12, 20].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([36, 44, 52, 60, 64, 12, 20, 28].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([44, 52, 60, 64, 12, 20, 28, 36].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([52, 60, 64, 12, 20, 28, 36, 44].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([60, 64, 12, 20, 28, 36, 44, 52].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([64, 12, 20, 28, 36, 44, 52, 60].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([8, 9, 10, 11, 12, 13, 14, 15].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([16, 17, 18, 19, 20, 21, 22, 23].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([24, 25, 26, 27, 28, 29, 30, 31].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([32, 33, 34, 35, 36, 37, 38, 39].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([40, 41, 42, 43, 44, 45, 46, 47].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([48, 49, 50, 51, 52, 53, 54, 55].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([56, 57, 58, 59, 60, 61, 62, 63].map((index) => index + 0b1000_0000)),
    },
    {
      ...DEFAULT_LIGHTS_FRAME,
      colors: createLightColorsArray([0, 1, 2, 3, 4, 5, 6, 7].map((index) => index + 0b1000_0000)),
    },
  ],
});
