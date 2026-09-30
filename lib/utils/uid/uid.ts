import type { RandomNumberGenerator, UidGenerator } from './uid.types';

export const fallbackRandomNumber: RandomNumberGenerator = (size) => {
  return Math.trunc(Math.random() * size);
};

export const secureRandomNumber: RandomNumberGenerator = (size) => {
  const uint8 = new Uint8Array(1);
  try {
    globalThis.crypto.getRandomValues(uint8);
    return (uint8[0] ?? 0) % size;
  } catch {
    return fallbackRandomNumber(size);
  }
};

export const generateUid: UidGenerator = (pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx') => {
  return pattern.replaceAll(/[xy]/g, (c) => {
    const r = secureRandomNumber(16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
