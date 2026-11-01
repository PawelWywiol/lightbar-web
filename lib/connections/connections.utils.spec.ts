import { describe, expect, it } from 'vitest';
import { connectionRequestDataToBinaryData, isConnectionResponseData } from './connections.utils';

const info = (adjust?: unknown) => ({ type: 'info', data: { uid: 'a', leds: 86, network: 1, adjust } });

describe('connectionRequestDataToBinaryData', () => {
  it('encodes settings with a signed color shift', () => {
    const bytes = connectionRequestDataToBinaryData([
      { type: 'adjust', data: { brightness: 75, speed: 150, hue: -32 } },
    ]);
    const view = new DataView(bytes.buffer);

    expect(bytes).toHaveLength(15);
    expect(view.getUint32(0, true)).toBe(0x63_74_72_6c);
    expect(view.getUint32(4, true)).toBe(3);
    expect(view.getUint8(8)).toBe(75);
    expect(view.getUint8(9)).toBe(150);
    expect(view.getInt8(10)).toBe(-32);
    expect(view.getUint32(11, true)).toBe(0x45_4f_4c_00);
  });
});

describe('isConnectionResponseData', () => {
  it('accepts a device with and without settings', () => {
    expect(isConnectionResponseData(info())).toBe(true);
    expect(isConnectionResponseData(info({ brightness: 100, speed: 100, hue: 0 }))).toBe(true);
  });

  it('rejects malformed settings', () => {
    expect(isConnectionResponseData(info({ brightness: '100', speed: 100, hue: 0 }))).toBe(false);
  });
});
