import { describe, expect, it } from 'vitest';
import type { LightColor, LightsScheme } from '../lights/lights.types';
import { decodeScheme, encodeScheme } from './schemeFormat';

const HEAD = 0x68_65_61_64;
const FRAME = 0x66_72_61_6d;
const EOL = 0x45_4f_4c_00;

const scheme = (name: string, frames: number[][]): LightsScheme => ({
  name,
  frames: frames.map((colors, index) => ({
    type: index % 2 === 0 ? 0 : 1,
    tempo: 60,
    colors: colors as LightColor[],
  })),
});

const chunk = (type: number, payload: number[]) => {
  const bytes = new Uint8Array(12 + payload.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, type, true);
  view.setUint32(4, payload.length, true);
  bytes.set(payload, 8);
  view.setUint32(8 + payload.length, EOL, true);
  return [...bytes];
};

const bytesOf = (...chunks: number[][]) => new Uint8Array(chunks.flat());

describe('encodeScheme', () => {
  it('writes head chunk with version and name, then frame chunks', () => {
    const bytes = encodeScheme(scheme('ab', [[1, 2]]));

    expect([...bytes]).toEqual([...chunk(HEAD, [1, 2, 0x61, 0x62]), ...chunk(FRAME, [0, 60, 1, 2])]);
  });

  it('truncates name to 64 UTF-8 bytes without splitting characters', () => {
    const bytes = encodeScheme(scheme('ż'.repeat(40), [[1]]));
    const nameLength = bytes[9] ?? 0;

    expect(nameLength).toBe(64);
    expect(decodeScheme(bytes)?.name).toBe('ż'.repeat(32));
  });
});

describe('decodeScheme', () => {
  it('round-trips scheme', () => {
    const original = scheme('Tęcza', [
      [1, 2, 3],
      [4, 5, 6],
    ]);

    expect(decodeScheme(encodeScheme(original))).toEqual(original);
  });

  it('skips unknown chunks', () => {
    const bytes = bytesOf(chunk(HEAD, [1, 1, 0x61]), chunk(0x11_22_33_44, [9, 9]), chunk(FRAME, [0, 60, 7]));

    expect(decodeScheme(bytes)).toEqual(scheme('a', [[7]]));
  });

  it.each([
    ['no head', bytesOf(chunk(FRAME, [0, 60, 7]))],
    ['unsupported version', bytesOf(chunk(HEAD, [2, 0]), chunk(FRAME, [0, 60, 7]))],
    ['no frames', bytesOf(chunk(HEAD, [1, 0]))],
    ['name longer than payload', bytesOf(chunk(HEAD, [1, 5, 0x61]), chunk(FRAME, [0, 60, 7]))],
    ['frame without colors', bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [0, 60]))],
    ['unknown frame type', bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [2, 60, 7]))],
    ['too many colors', bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [0, 60, ...Array.from({ length: 256 }, () => 1)]))],
    ['too many frames', bytesOf(chunk(HEAD, [1, 0]), ...Array.from({ length: 256 }, () => chunk(FRAME, [0, 60, 1])))],
    ['truncated chunk', bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [0, 60, 7]).slice(0, -2))],
    [
      'bad EOL',
      bytesOf(
        chunk(HEAD, [1, 0]),
        chunk(FRAME, [0, 60, 7]).map((v, i, a) => (i === a.length - 1 ? 1 : v)),
      ),
    ],
    ['empty', new Uint8Array()],
  ])('rejects %s', (_, bytes) => {
    expect(decodeScheme(bytes)).toBeUndefined();
  });
});
