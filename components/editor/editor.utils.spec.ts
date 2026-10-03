import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
  LIGHTS_BACKGROUND_COLOR,
} from '../../lib/lights/lights.config';
import type { LightColor, LightsScheme } from '../../lib/lights/lights.types';
import {
  addRow,
  clampLightsCount,
  cloneRow,
  deleteRow,
  getLightsCount,
  moveRow,
  normalizeScheme,
  paintCells,
  pushRecentColor,
  resizeScheme,
  resolveBinaryColorStyle,
  shiftRow,
  shiftScheme,
  shuffleRow,
  updateRow,
} from './editor.utils';

const BG = LIGHTS_BACKGROUND_COLOR;

const createScheme = (rows: number[][]): LightsScheme => ({
  name: 'test',
  frames: rows.map((colors) => ({
    type: DEFAULT_LIGHTS_FRAME_TYPE,
    tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
    colors: colors.map((color) => color as LightColor),
  })),
});

const colorsOf = (scheme: LightsScheme) => scheme.frames.map((frame) => frame.colors);

describe('editor.utils', () => {
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

  describe('scheme operations', () => {
    it('getLightsCount returns first row length or 0', () => {
      expect(getLightsCount(createScheme([[1, 2, 3]]))).toBe(3);
      expect(getLightsCount({ name: '', frames: [] })).toBe(0);
    });

    it('clampLightsCount clamps to 1..255 and truncates', () => {
      expect(clampLightsCount(0)).toBe(1);
      expect(clampLightsCount(300)).toBe(255);
      expect(clampLightsCount(7.9)).toBe(7);
    });

    it('resizeScheme trims and pads every row', () => {
      const scheme = createScheme([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(colorsOf(resizeScheme(scheme, 2))).toEqual([
        [1, 2],
        [4, 5],
      ]);
      expect(colorsOf(resizeScheme(scheme, 4))).toEqual([
        [1, 2, 3, BG],
        [4, 5, 6, BG],
      ]);
    });

    it('normalizeScheme aligns rows to the first row and keeps at least one light and row', () => {
      expect(colorsOf(normalizeScheme(createScheme([[1, 2], [3]])))).toEqual([
        [1, 2],
        [3, BG],
      ]);
      expect(colorsOf(normalizeScheme(createScheme([[]])))).toEqual([[BG]]);
      expect(colorsOf(normalizeScheme({ name: '', frames: [] }))).toEqual([[BG]]);
    });

    it('paintCells paints given cells and keeps untouched rows by reference', () => {
      const scheme = createScheme([
        [1, 2],
        [3, 4],
        [5, 6],
      ]);
      const result = paintCells(
        scheme,
        [
          { row: 0, column: 1 },
          { row: 1, column: 0 },
        ],
        9 as LightColor,
      );
      expect(colorsOf(result)).toEqual([
        [1, 9],
        [9, 4],
        [5, 6],
      ]);
      expect(result.frames[2]).toBe(scheme.frames[2]);
    });

    it('updateRow patches type and tempo of one row', () => {
      const result = updateRow(createScheme([[1], [2]]), 1, { tempo: 60 });
      expect(result.frames[1]?.tempo).toBe(60);
      expect(result.frames[0]?.tempo).toBe(DEFAULT_LIGHTS_FRAME_TEMPO);
    });

    it('addRow inserts a background row after the given row', () => {
      expect(
        colorsOf(
          addRow(
            createScheme([
              [1, 2],
              [3, 4],
            ]),
            0,
          ),
        ),
      ).toEqual([
        [1, 2],
        [BG, BG],
        [3, 4],
      ]);
    });

    it('cloneRow inserts a deep copy after the source row', () => {
      const result = cloneRow(
        createScheme([
          [1, 2],
          [3, 4],
        ]),
        0,
      );
      expect(colorsOf(result)).toEqual([
        [1, 2],
        [1, 2],
        [3, 4],
      ]);
      expect(result.frames[1]).not.toBe(result.frames[0]);
    });

    it('deleteRow removes a row but keeps the last one', () => {
      expect(
        colorsOf(
          deleteRow(
            createScheme([
              [1, 2],
              [3, 4],
            ]),
            0,
          ),
        ),
      ).toEqual([[3, 4]]);
      const single = createScheme([[1]]);
      expect(deleteRow(single, 0)).toBe(single);
    });

    it('moveRow moves a row to the target index', () => {
      const scheme = createScheme([[1], [2], [3]]);
      expect(colorsOf(moveRow(scheme, 0, 2))).toEqual([[2], [3], [1]]);
      expect(colorsOf(moveRow(scheme, 2, 0))).toEqual([[3], [1], [2]]);
    });

    it('shiftRow rotates one row with wrapping in both directions', () => {
      const scheme = createScheme([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(colorsOf(shiftRow(scheme, 0, 1))).toEqual([
        [3, 1, 2],
        [4, 5, 6],
      ]);
      expect(colorsOf(shiftRow(scheme, 0, -1))[0]).toEqual([2, 3, 1]);
      expect(colorsOf(shiftRow(scheme, 0, 4))[0]).toEqual([3, 1, 2]);
      expect(colorsOf(shiftRow(scheme, 0, -4))[0]).toEqual([2, 3, 1]);
    });

    it('shiftScheme rotates rows up/down and all columns left/right', () => {
      expect(colorsOf(shiftScheme(createScheme([[1], [2], [3]]), 'up'))).toEqual([[2], [3], [1]]);
      expect(colorsOf(shiftScheme(createScheme([[1], [2], [3]]), 'down'))).toEqual([[3], [1], [2]]);
      const scheme = createScheme([
        [1, 2, 3],
        [4, 5, 6],
      ]);
      expect(colorsOf(shiftScheme(scheme, 'left'))).toEqual([
        [2, 3, 1],
        [5, 6, 4],
      ]);
      expect(colorsOf(shiftScheme(scheme, 'right'))).toEqual([
        [3, 1, 2],
        [6, 4, 5],
      ]);
    });

    it('shuffleRow keeps the color multiset and other rows', () => {
      const scheme = createScheme([
        [1, 2, 3, 4, 5],
        [6, 7],
      ]);
      const result = shuffleRow(scheme, 0);
      expect([...(result.frames[0]?.colors ?? [])].toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
      expect(result.frames[1]).toBe(scheme.frames[1]);
    });
  });

  describe('pushRecentColor', () => {
    const initial = [137, 145, 153, 161, 169, 177, 185] as LightColor[];
    const X = 5 as LightColor;
    const Y = 6 as LightColor;

    it('returns the same list when the color does not change', () => {
      expect(pushRecentColor(initial, X, X)).toBe(initial);
    });

    it('puts the previous color first and keeps seven colors', () => {
      const afterX = pushRecentColor(initial, 129 as LightColor, X);
      expect(afterX).toEqual([129, 137, 145, 153, 161, 169, 177]);
      expect(pushRecentColor(afterX, X, Y)).toEqual([X, 129, 137, 145, 153, 161, 169]);
    });

    it('removes duplicates of the previous and the next color', () => {
      expect(pushRecentColor(initial, 161 as LightColor, 145 as LightColor)).toEqual([161, 137, 153, 169, 177, 185]);
    });

    it('shifts the colors up to a clicked recent color', () => {
      expect(pushRecentColor(initial, 129 as LightColor, 161 as LightColor)).toEqual([
        129, 137, 145, 153, 169, 177, 185,
      ]);
    });

    it('swaps the picker with the first recent color', () => {
      expect(pushRecentColor(initial, 129 as LightColor, 137 as LightColor)).toEqual([
        129, 145, 153, 161, 169, 177, 185,
      ]);
    });
  });
});
