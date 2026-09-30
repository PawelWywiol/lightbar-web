import { z } from 'zod';

import { lightsFrameType } from './lights.types';

export const LightsSchemeValidationSchema = z.object({
  name: z.string(),
  frames: z.array(
    z.object({
      type: z.nativeEnum(lightsFrameType),
      tempo: z.number(),
      colors: z.array(z.number()),
    }),
  ),
});

export const LightsSchemeDataValidationSchema = z.object({
  uid: z.string(),
  scheme: LightsSchemeValidationSchema,
  updatedAt: z.string(),
});

export const LightsSchemeDataArrayValidationSchema = z.array(LightsSchemeDataValidationSchema);
