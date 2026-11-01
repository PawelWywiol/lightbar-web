import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { getLightsCount } from '../editor/editor.utils';

const SIZED_NAME = /^(.+) (\d+)$/;

const getFamilyName = ({ scheme }: LightsSchemeData) => {
  const [, familyName, size] = SIZED_NAME.exec(scheme.name) ?? [];
  return familyName && Number(size) === getLightsCount(scheme) ? familyName : undefined;
};

export const isFamilyScheme = (schemes: LightsSchemeData[], schemeData: LightsSchemeData) => {
  const familyName = getFamilyName(schemeData);
  return (
    familyName !== undefined &&
    schemes.some((other) => other.uid !== schemeData.uid && getFamilyName(other) === familyName)
  );
};

const isCloser = (candidate: LightsSchemeData, current: LightsSchemeData, lightsCount: number) => {
  const candidateSize = getLightsCount(candidate.scheme);
  const currentSize = getLightsCount(current.scheme);
  const difference = Math.abs(candidateSize - lightsCount) - Math.abs(currentSize - lightsCount);
  return difference < 0 || (difference === 0 && candidateSize < currentSize);
};

export const selectSchemesForLights = (schemes: LightsSchemeData[], lightsCount: number) => {
  const closest = new Map<string, LightsSchemeData>();

  for (const schemeData of schemes) {
    const familyName = getFamilyName(schemeData);
    if (familyName === undefined) continue;
    const current = closest.get(familyName);
    if (!current || isCloser(schemeData, current, lightsCount)) closest.set(familyName, schemeData);
  }

  return schemes.filter((schemeData) => {
    const familyName = getFamilyName(schemeData);
    return familyName === undefined || closest.get(familyName)?.uid === schemeData.uid;
  });
};
