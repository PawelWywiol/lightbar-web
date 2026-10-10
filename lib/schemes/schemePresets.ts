import { createLightColor, LIGHTS_BACKGROUND_COLOR } from '../lights/lights.config';
import { lightsFrameType } from '../lights/lights.types';
import type { LightColor, LightsFrame, LightsFrameType, LightsSchemeData } from '../lights/lights.types';

const LIGHTS = 16;
const PRESETS_UPDATED_AT = '2026-10-10T00:00:00.000Z';

const HUE = { red: 0, orange: 4, amber: 6, yellow: 10, green: 21, cyan: 32, blue: 42, purple: 48, magenta: 53 };
const WHITE_HUE = 63;
const OFF = LIGHTS_BACKGROUND_COLOR;

const color = (hue: number, level = 3): LightColor => createLightColor((level << 6) | hue);

const lights = (resolve: (index: number) => LightColor) => Array.from({ length: LIGHTS }, (_, index) => resolve(index));

const frame = (type: LightsFrameType, tempo: number, colors: LightColor[]): LightsFrame => ({ type, tempo, colors });

const frames = (count: number, create: (index: number) => LightsFrame) =>
  Array.from({ length: count }, (_, index) => create(index));

const createRandom = (seed: number) => {
  let state = seed;
  return (max: number) => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return (state >>> 16) % max;
  };
};

const preset = (slug: string, name: string, schemeFrames: LightsFrame[]): LightsSchemeData => ({
  uid: `preset-${slug}`,
  updatedAt: PRESETS_UPDATED_AT,
  scheme: { name, frames: schemeFrames },
});

const { step, fade } = lightsFrameType;

const sparkles = () => {
  const random = createRandom(7);
  let position = 0;
  return frames(LIGHTS, () => {
    position = (position + 1 + random(LIGHTS - 1)) % LIGHTS;
    return frame(
      step,
      240,
      lights((index) => (index === position ? color(WHITE_HUE) : OFF)),
    );
  });
};

const fire = () => {
  const random = createRandom(11);
  const palette = [
    color(HUE.red, 1),
    color(HUE.red, 3),
    color(HUE.orange, 2),
    color(HUE.orange, 3),
    color(HUE.amber, 3),
  ];
  return frames(8, () =>
    frame(
      fade,
      240,
      lights(() => palette[random(palette.length)] ?? OFF),
    ),
  );
};

const scannerPositions = [
  ...Array.from({ length: LIGHTS }, (_, index) => index),
  ...Array.from({ length: LIGHTS - 2 }, (_, index) => LIGHTS - 2 - index),
];

const oceanPalette = [
  color(HUE.blue, 1),
  color(HUE.blue, 2),
  color(HUE.cyan, 2),
  color(HUE.cyan, 3),
  color(HUE.cyan, 2),
  color(HUE.blue, 2),
  color(HUE.blue, 1),
  color(HUE.blue, 0),
];

export const SCHEME_PRESETS: LightsSchemeData[] = [
  preset('christmas-blink', 'Christmas blink', [
    frame(
      step,
      120,
      lights((index) => (index % 2 === 0 ? color(HUE.red) : color(HUE.green))),
    ),
    frame(
      step,
      120,
      lights((index) => (index % 2 === 0 ? color(HUE.green) : color(HUE.red))),
    ),
  ]),
  preset(
    'rainbow-flow',
    'Rainbow flow',
    frames(LIGHTS, (shift) =>
      frame(
        fade,
        240,
        lights((index) => color(((index + shift) * 4) % 64)),
      ),
    ),
  ),
  preset(
    'rainbow-pulse',
    'Rainbow pulse',
    [HUE.red, HUE.yellow, HUE.green, HUE.cyan, HUE.blue, HUE.magenta].map((hue) =>
      frame(
        fade,
        30,
        lights(() => color(hue)),
      ),
    ),
  ),
  preset('sparkles', 'Sparkles', sparkles()),
  preset('police', 'Police', [
    frame(
      step,
      240,
      lights((index) => (index < LIGHTS / 2 ? color(HUE.red) : OFF)),
    ),
    frame(
      step,
      240,
      lights(() => OFF),
    ),
    frame(
      step,
      240,
      lights((index) => (index < LIGHTS / 2 ? OFF : color(HUE.blue))),
    ),
    frame(
      step,
      240,
      lights(() => OFF),
    ),
  ]),
  preset(
    'scanner',
    'Scanner',
    scannerPositions.map((position) =>
      frame(
        step,
        240,
        lights((index) => {
          if (index === position) return color(HUE.red);
          return Math.abs(index - position) === 1 ? color(HUE.red, 1) : OFF;
        }),
      ),
    ),
  ),
  preset('fire', 'Fire', fire()),
  preset(
    'ocean-waves',
    'Ocean waves',
    frames(oceanPalette.length, (shift) =>
      frame(
        fade,
        120,
        lights((index) => oceanPalette[(index + shift) % oceanPalette.length] ?? OFF),
      ),
    ),
  ),
  preset(
    'theater-chase',
    'Theater chase',
    frames(3, (shift) =>
      frame(
        step,
        240,
        lights((index) => (index % 3 === shift ? color(HUE.amber) : OFF)),
      ),
    ),
  ),
  preset(
    'breathing',
    'Breathing',
    [0, 1, 2, 3, 2, 1].map((level) =>
      frame(
        fade,
        120,
        lights(() => color(HUE.purple, level)),
      ),
    ),
  ),
];

export const getSchemePreset = (uid: string) => SCHEME_PRESETS.find((schemePreset) => schemePreset.uid === uid);
