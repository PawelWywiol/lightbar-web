import { LIGHTS_PALLETTE_HUE_MASK, LIGHTS_PALLETTE_LIGHTNESS_MASK } from './lights.config';

import type { LightColor } from './lights.types';

export const createLightColor = (index: number): LightColor => {
  if (index < 0 || index > LIGHTS_PALLETTE_HUE_MASK + LIGHTS_PALLETTE_LIGHTNESS_MASK) {
    throw new Error(`Invalid color index: ${index}`);
  }

  return index as LightColor;
};

export const createLightColorsArray = (indexes: number[]): LightColor[] =>
  indexes.map((index) => createLightColor(index));
