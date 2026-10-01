type Enumerate<N extends number, Accumulator extends number[] = []> = Accumulator['length'] extends N
  ? Accumulator[number]
  : Enumerate<N, [...Accumulator, Accumulator['length']]>;

type Range<From extends number, To extends number> = Exclude<Enumerate<To>, Enumerate<From>>;

type ColorHue = Range<0, 64>;
type ColorLightness = Range<0, 4>;

export type LightColor = number & {
  __hue: ColorHue;
  __lightness: ColorLightness;
};

export const lightsFrameType = {
  step: 0,
  fade: 1,
} as const;

export type LightsFrameType = (typeof lightsFrameType)[keyof typeof lightsFrameType];

export interface LightsFrame {
  type: LightsFrameType;
  tempo: number;
  colors: LightColor[];
}

export interface LightsLayoutOption {
  value: number;
  label: string;
  grid: {
    rows: number;
    columns: number;
  };
}

export type LightsLayoutOptions = [LightsLayoutOption, ...LightsLayoutOption[]];

export interface LightsFrameTypeOption {
  value: LightsFrameType;
  label: string;
}

export interface LightsFrameTempoOption {
  value: string;
  label: string;
}

export interface LightsScheme {
  name: string;
  frames: LightsFrame[];
}

export interface LightsSchemeData {
  uid: string;
  scheme: LightsScheme;
  updatedAt: string;
}
