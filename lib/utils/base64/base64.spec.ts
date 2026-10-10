import { describe, expect, it } from 'vitest';
import { fromBase64, toBase64 } from './base64';

describe('base64', () => {
  it('round-trips all byte values', () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, index) => index);

    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });

  it('returns empty bytes for invalid input', () => {
    expect(fromBase64('%%%')).toEqual(new Uint8Array());
  });
});
