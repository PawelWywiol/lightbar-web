import { describe, expect, it } from 'vitest';
import { LIGHTS_BACKGROUND_COLOR } from '../../lib/lights/lights.config';
import type { LightColor } from '../../lib/lights/lights.types';
import { resolveBinaryColorStyle, shiftColorsFrame } from './editor.utils';

const createTestFrame = (length: number): LightColor[] =>
  Array.from({ length }, (_, i) => i as LightColor);

describe('editor.utils', () => {
  describe('shiftColorsFrame', () => {
    describe('prev direction', () => {
      it('should rotate colors forward by 1', () => {
        const frame = createTestFrame(4);
        const result = shiftColorsFrame(frame, 'prev', 1, 4);
        expect(result).toEqual([1, 2, 3, 0]);
      });
    });

    describe('next direction', () => {
      it('should rotate colors backward by 1', () => {
        const frame = createTestFrame(4);
        const result = shiftColorsFrame(frame, 'next', 1, 4);
        expect(result).toEqual([3, 0, 1, 2]);
      });
    });

    describe('up direction', () => {
      it('should shift rows up in 2x4 grid', () => {
        const frame = createTestFrame(8); // [0,1,2,3,4,5,6,7]
        const result = shiftColorsFrame(frame, 'up', 2, 4);
        // Row 0: [0,1,2,3], Row 1: [4,5,6,7]
        // After up: Row 0: [4,5,6,7], Row 1: [0,1,2,3]
        expect(result).toEqual([4, 5, 6, 7, 0, 1, 2, 3]);
      });
    });

    describe('down direction', () => {
      it('should shift rows down in 2x4 grid', () => {
        const frame = createTestFrame(8);
        const result = shiftColorsFrame(frame, 'down', 2, 4);
        expect(result).toEqual([4, 5, 6, 7, 0, 1, 2, 3]);
      });
    });

    describe('left direction', () => {
      it('should shift columns left in 2x4 grid', () => {
        const frame = createTestFrame(8);
        const result = shiftColorsFrame(frame, 'left', 2, 4);
        // Columns shift left: col0->end, col1->col0, etc.
        expect(result).toEqual([1, 2, 3, 0, 5, 6, 7, 4]);
      });
    });

    describe('right direction', () => {
      it('should shift columns right in 2x4 grid', () => {
        const frame = createTestFrame(8);
        const result = shiftColorsFrame(frame, 'right', 2, 4);
        expect(result).toEqual([3, 0, 1, 2, 7, 4, 5, 6]);
      });
    });

    describe('shuffle direction', () => {
      it('should return array of same length', () => {
        const frame = createTestFrame(8);
        const result = shiftColorsFrame(frame, 'shuffle', 2, 4);
        expect(result).toHaveLength(8);
      });

      it('should contain all original elements', () => {
        const frame = createTestFrame(8);
        const result = shiftColorsFrame(frame, 'shuffle', 2, 4);
        expect(result.sort()).toEqual(frame.sort());
      });
    });

    describe('default/unknown direction', () => {
      it('should return unchanged frame', () => {
        const frame = createTestFrame(4);
        const result = shiftColorsFrame(frame, 'unknown' as never, 1, 4);
        expect(result).toEqual(frame);
      });
    });

    describe('empty frame', () => {
      it('should handle empty frame', () => {
        const frame: LightColor[] = [];
        const result = shiftColorsFrame(frame, 'prev', 0, 0);
        expect(result).toEqual([LIGHTS_BACKGROUND_COLOR]);
      });
    });
  });

  describe('resolveBinaryColorStyle', () => {
    it('should return HSL string for color 0', () => {
      const result = resolveBinaryColorStyle(0 as LightColor);
      expect(result).toMatch(/^hsl\(\d+deg \d+% \d+%\)$/);
    });

    it('should return black for LIGHTS_BACKGROUND_COLOR', () => {
      const result = resolveBinaryColorStyle(LIGHTS_BACKGROUND_COLOR);
      expect(result).toContain('0%');
    });

    it('should return consistent results for same input', () => {
      const color = 42 as LightColor;
      const result1 = resolveBinaryColorStyle(color);
      const result2 = resolveBinaryColorStyle(color);
      expect(result1).toBe(result2);
    });
  });
});
