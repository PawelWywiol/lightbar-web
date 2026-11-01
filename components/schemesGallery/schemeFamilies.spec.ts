import { describe, expect, it } from 'vitest';
import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';
import { isFamilyScheme, selectSchemesForLights } from './schemeFamilies';

const schemeData = (name: string, length: number): LightsSchemeData => ({
  uid: name,
  updatedAt: '2026-11-01T00:00:00.000Z',
  scheme: {
    name,
    frames: [
      {
        type: 0,
        shuffle: false,
        hueShift: 0,
        pixelShift: 0,
        tempo: 60,
        colors: Array.from({ length }, (_, index) => index % 60) as LightColor[],
      },
    ],
  },
});

const COMETS = [schemeData('Comet 8', 8), schemeData('Comet 64', 64), schemeData('Comet 128', 128)];
const names = (schemes: LightsSchemeData[]) => schemes.map(({ scheme }) => scheme.name);

describe('selectSchemesForLights', () => {
  it('keeps the exact version of a family', () => {
    expect(names(selectSchemesForLights(COMETS, 64))).toEqual(['Comet 64']);
  });

  it('keeps the closest version when no exact one exists', () => {
    expect(names(selectSchemesForLights(COMETS, 86))).toEqual(['Comet 64']);
    expect(names(selectSchemesForLights(COMETS, 720))).toEqual(['Comet 128']);
  });

  it('prefers the smaller version on a tie', () => {
    expect(names(selectSchemesForLights(COMETS, 96))).toEqual(['Comet 64']);
  });

  it('keeps every family and single scheme', () => {
    const schemes = [
      ...COMETS,
      schemeData('Rainbow 8', 8),
      schemeData('Rainbow 64', 64),
      schemeData('Fire', 8),
      schemeData('Scanner', 16),
    ];

    expect(names(selectSchemesForLights(schemes, 64))).toEqual(['Comet 64', 'Rainbow 64', 'Fire', 'Scanner']);
  });

  it('does not treat a number unrelated to the length as a size', () => {
    const schemes = [schemeData('Party 2026', 16), schemeData('Party 2027', 16)];

    expect(names(selectSchemesForLights(schemes, 16))).toEqual(['Party 2026', 'Party 2027']);
  });
});

describe('isFamilyScheme', () => {
  it('recognizes a sized scheme with siblings', () => {
    expect(isFamilyScheme(COMETS, COMETS[0] as LightsSchemeData)).toBe(true);
  });

  it('rejects a sized scheme without siblings and an unsized one', () => {
    const alone = schemeData('Solo 8', 8);
    const fire = schemeData('Fire', 8);

    expect(isFamilyScheme([...COMETS, alone, fire], alone)).toBe(false);
    expect(isFamilyScheme([...COMETS, alone, fire], fire)).toBe(false);
  });
});
