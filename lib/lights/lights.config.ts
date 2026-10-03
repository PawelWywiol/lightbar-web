import type {
  LightColor,
  LightsFrame,
  LightsFrameTempoOption,
  LightsFrameType,
  LightsFrameTypeOption,
  LightsScheme,
} from './lights.types';

export const LIGHTS_SCHEME_NAME_MAX_LENGTH = 16;

export const LIGHTS_PALLETTE_HUE_MASK = 0b0011_1111;
export const LIGHTS_PALLETTE_HUE_MAX = LIGHTS_PALLETTE_HUE_MASK + 1;
export const LIGHTS_PALLETTE_LIGHTNESS_MASK = 0b1100_0000;
export const LIGHTS_PALLETTE_LIGHTNESS_STEP = 20;
export const LIGHTS_PALLETTE_LIGHTNESS_BASE = 20;

export const createLightColor = (index: number): LightColor => {
  if (index < 0 || index > LIGHTS_PALLETTE_HUE_MASK + LIGHTS_PALLETTE_LIGHTNESS_MASK) {
    throw new Error(`Invalid color index: ${index}`);
  }

  return index as LightColor;
};

const createLightColorsArray = (indexes: number[]): LightColor[] => indexes.map((index) => createLightColor(index));

export const LIGHTS_BACKGROUND_COLOR: LightColor = createLightColor(LIGHTS_PALLETTE_HUE_MASK);

export const LIGHTS_FRAME_TYPES: LightsFrameTypeOption[] = [
  {
    value: 0,
    label: 'Step',
  },
  {
    value: 1,
    label: 'Fade',
  },
];

export const LIGHTS_FRAME_TEMPO_OPTIONS: LightsFrameTempoOption[] = [
  {
    value: '240',
    label: '250 ms',
  },
  {
    value: '120',
    label: '500 ms',
  },
  {
    value: '80',
    label: '750 ms',
  },
  {
    value: '60',
    label: '1.00 sec',
  },
  {
    value: '48',
    label: '1.25 sec',
  },
  {
    value: '32',
    label: '1.87 sec',
  },
  {
    value: '16',
    label: '3.75 sec',
  },
  {
    value: '8',
    label: '7.50 sec',
  },
  {
    value: '4',
    label: '15 sec',
  },
  {
    value: '3',
    label: '20 sec',
  },
  {
    value: '2',
    label: '30 sec',
  },
  {
    value: '1',
    label: '1 min',
  },
];

export const DEFAULT_LIGHTS_FRAME_TEMPO = 60;

export const resolveFrameSeconds = (tempo: number): number => 60 / (tempo || 1);
export const DEFAULT_LIGHTS_FRAME_TYPE: LightsFrameType = 0;
const DEFAULT_LIGHTS_FRAME: LightsFrame = {
  type: DEFAULT_LIGHTS_FRAME_TYPE,
  tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
  colors: [],
};

export const DEFAULT_LIGHTS_SCHEME: LightsScheme = {
  name: 'New scheme',
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
};
