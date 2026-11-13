import { describe, expect, it } from 'vitest';
import type { LightColor, LightsScheme } from '../lights/lights.types';
import { decodeScheme, encodeScheme } from './schemeFormat';

const HEAD = 0x68_65_61_64;
const FRAME = 0x66_72_6d_33;
const EOL = 0x45_4f_4c_00;

const scheme = (
  name: string,
  frames: number[][],
  shuffle = false,
  hueShifts: number[] = [],
  pixelShifts: number[] = [],
  repeats: number[] = [],
): LightsScheme => ({
  name,
  frames: frames.map((colors, index) => ({
    type: index % 2 === 0 ? 0 : 1,
    shuffle,
    hueShift: hueShifts[index] ?? 0,
    pixelShift: pixelShifts[index] ?? 0,
    repeat: repeats[index] ?? 0,
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

    expect([...bytes]).toEqual([...chunk(HEAD, [1, 2, 0x61, 0x62]), ...chunk(FRAME, [0, 0, 0, 60, 1, 2])]);
  });

  it('packs fade and shuffle into frame flags byte', () => {
    const bytes = encodeScheme(scheme('a', [[1], [2]], true));

    expect([...bytes]).toEqual([
      ...chunk(HEAD, [1, 1, 0x61]),
      ...chunk(FRAME, [2, 0, 0, 60, 1]),
      ...chunk(FRAME, [3, 0, 0, 60, 2]),
    ]);
  });

  it('packs hue shift as signed 6-bit value into frame flags byte', () => {
    const bytes = encodeScheme(scheme('a', [[1], [2], [3]], true, [-1, 31, -32]));

    expect([...bytes]).toEqual([
      ...chunk(HEAD, [1, 1, 0x61]),
      ...chunk(FRAME, [0b1111_1110, 0, 0, 60, 1]),
      ...chunk(FRAME, [0b0111_1111, 0, 0, 60, 2]),
      ...chunk(FRAME, [0b1000_0010, 0, 0, 60, 3]),
    ]);
  });

  it('writes pixel shift as signed byte after frame flags', () => {
    const bytes = encodeScheme(scheme('a', [[1], [2], [3]], false, [], [-1, 127, -128]));

    expect([...bytes]).toEqual([
      ...chunk(HEAD, [1, 1, 0x61]),
      ...chunk(FRAME, [0, 0xff, 0, 60, 1]),
      ...chunk(FRAME, [1, 0x7f, 0, 60, 2]),
      ...chunk(FRAME, [0, 0x80, 0, 60, 3]),
    ]);
  });

  it('writes repeat byte between pixel shift and tempo', () => {
    const bytes = encodeScheme(scheme('a', [[1], [2]], false, [], [], [0, 255]));

    expect([...bytes]).toEqual([
      ...chunk(HEAD, [1, 1, 0x61]),
      ...chunk(FRAME, [0, 0, 0, 60, 1]),
      ...chunk(FRAME, [1, 0, 255, 60, 2]),
    ]);
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

  it('round-trips shuffle flag', () => {
    const shuffled = scheme('a', [[1], [2]], true);

    expect(decodeScheme(encodeScheme(shuffled))).toEqual(shuffled);
  });

  it('round-trips hue shift range', () => {
    const shifted = scheme('a', [[1], [2], [3], [4]], false, [-32, -1, 1, 31]);

    expect(decodeScheme(encodeScheme(shifted))).toEqual(shifted);
  });

  it('decodes hue shift from frame flags bits 2-7', () => {
    const bytes = bytesOf(
      chunk(HEAD, [1, 1, 0x61]),
      chunk(FRAME, [0b1111_1101, 0, 0, 60, 7]),
      chunk(FRAME, [0b0000_0100, 0, 0, 60, 8]),
    );

    expect(decodeScheme(bytes)?.frames).toEqual([
      { type: 1, shuffle: false, hueShift: -1, pixelShift: 0, repeat: 0, tempo: 60, colors: [7] },
      { type: 0, shuffle: false, hueShift: 1, pixelShift: 0, repeat: 0, tempo: 60, colors: [8] },
    ]);
  });

  it('round-trips pixel shift range', () => {
    const shifted = scheme(
      'a',
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      false,
      [],
      [-128, -1, 127],
    );

    expect(decodeScheme(encodeScheme(shifted))).toEqual(shifted);
  });

  it('round-trips repeat range', () => {
    const repeated = scheme('a', [[1], [2], [3]], false, [], [], [0, 1, 255]);

    expect(decodeScheme(encodeScheme(repeated))).toEqual(repeated);
  });

  it('ignores old frame chunk types', () => {
    const bytes = bytesOf(chunk(HEAD, [1, 1, 0x61]), chunk(0x66_72_6d_32, [0, 0, 60, 7]));

    expect(decodeScheme(bytes)).toBeUndefined();
  });

  it('skips unknown chunks', () => {
    const bytes = bytesOf(chunk(HEAD, [1, 1, 0x61]), chunk(0x11_22_33_44, [9, 9]), chunk(FRAME, [0, 0, 0, 60, 7]));

    expect(decodeScheme(bytes)).toEqual(scheme('a', [[7]]));
  });

  it.each([
    ['no head', bytesOf(chunk(FRAME, [0, 0, 0, 60, 7]))],
    ['unsupported version', bytesOf(chunk(HEAD, [2, 0]), chunk(FRAME, [0, 0, 0, 60, 7]))],
    ['no frames', bytesOf(chunk(HEAD, [1, 0]))],
    ['name longer than payload', bytesOf(chunk(HEAD, [1, 5, 0x61]), chunk(FRAME, [0, 0, 0, 60, 7]))],
    ['frame without colors', bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [0, 0, 0, 60]))],
    [
      'too many colors',
      bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [0, 0, 0, 60, ...Array.from({ length: 721 }, () => 1)])),
    ],
    [
      'too many frames',
      bytesOf(chunk(HEAD, [1, 0]), ...Array.from({ length: 256 }, () => chunk(FRAME, [0, 0, 0, 60, 1]))),
    ],
    ['truncated chunk', bytesOf(chunk(HEAD, [1, 0]), chunk(FRAME, [0, 0, 0, 60, 7]).slice(0, -2))],
    [
      'bad EOL',
      bytesOf(
        chunk(HEAD, [1, 0]),
        chunk(FRAME, [0, 0, 0, 60, 7]).map((v, i, a) => (i === a.length - 1 ? 1 : v)),
      ),
    ],
    ['empty', new Uint8Array()],
  ])('rejects %s', (_, bytes) => {
    expect(decodeScheme(bytes)).toBeUndefined();
  });
});
